/** PREPARED, NOT EXECUTED by author. Requires reviewed1400 + both Edge handlers,
 * explicit private status/native-state paths and an EXCLUSIVE pinned runtime.
 * Only browser fixture identities are created/changed. Full48-table preservation
 * verification and exact cleanup use the reviewed private fixture helper. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { fixtureCommand, fixtureStateFile, privateJson, localFixtureEnvironment } from './account-deletion-fixture.mjs';
const statusFile = process.env.OBEDIENCE_LOCAL_STATUS_FILE, nativeFile = process.env.OBEDIENCE_LOCAL_NATIVE_STATE_FILE;
const enabled = statusFile && nativeFile && process.env.OBEDIENCE_ACCOUNT_DELETION_REVIEWED === '1';
const png = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==', 'base64'));
const hash = createHash('sha256').update(png).digest('hex');
test('real local account deletion retains only authorized survivor data and closes old access', {
  skip: enabled ? false : 'Prepared only: exact local private paths, reviewed flag and exclusive runtime required.', timeout: 360000,
}, async t => {
  const e = await localFixtureEnvironment(statusFile, nativeFile); const { req, ok, rows, service, anon } = e;
  const endpoint = '/functions/v1/account-deletion/';
  const denied = (r, code) => { assert.ok(r.status >= 400); if (code) assert.equal(r.data?.error?.code ?? r.data?.message, code); };
  // Contract check BEFORE fixture creation, so missing/wrong routing fails safely.
  const unavailable = await req('POST', endpoint + 'status', '', { jobId: randomUUID(), recoveryToken: randomBytes(32).toString('base64url') });
  assert.equal(unavailable.status, 404); assert.equal(unavailable.data?.error?.code, 'DELETION_UNAVAILABLE');
  let created = false;
  try {
    await fixtureCommand('create'); created = true; await fixtureCommand('enable-lifecycle');
    const state = await privateJson(fixtureStateFile); const dom = state.accounts.find(x => x.role === 'dom'), sub = state.accounts.find(x => x.role === 'sub');
    for (const a of [dom, sub]) { await e.own(a.id); a.token = ok(await req('POST', '/auth/v1/token?grant_type=password', anon, { email: a.email, password: a.password })).access_token; }
    const rpc = (a, name, body = {}) => req('POST', `/rest/v1/rpc/${name}`, a?.token ?? service, body);
    const identity = async a => ok(await rpc(a, 'get_my_identity'));
    const scope = i => ({ p_expected_relationship_id: i.relationship_id, p_expected_relationship_session_id: i.relationship_session_id });
    const di = await identity(dom), si = await identity(sub), period = di.relationship_id;
    const conversation = ok(await rpc(dom, 'get_my_conversations', scope(di))).currentConversationId;
    assert.ok(conversation); assert.equal(period, si.relationship_id);
    const makeCommand = i => ({ commandId: randomUUID(), expectedRelationshipId: i.relationship_id, expectedRelationshipSessionId: i.relationship_session_id, recoveryToken: randomBytes(32).toString('base64url') });
    const recovery = command => ({ jobId: command.commandId, recoveryToken: command.recoveryToken });
    const command = makeCommand(di);
    const send = (a, i, attachment, text) => rpc(a, 'send_message', { ...scope(i), p_command_id: randomUUID(), p_conversation_id: conversation, p_content: text, p_attachment_id: attachment });
    await t.test('gates, current context and legacy bypass checked before preparation', async () => {
      denied(await rpc(dom, 'delete_user_account'));
      ok(await req('PATCH',`/rest/v1/identity_contexts?user_id=eq.${dom.id}`,service,{lifecycle_ready:false}));
      denied(await req('POST',endpoint+'start',dom.token,command),'LIFECYCLE_INTEGRATION_REQUIRED');
      ok(await req('PATCH',`/rest/v1/identity_contexts?user_id=eq.${dom.id}`,service,{lifecycle_ready:true}));
      denied(await req('POST', endpoint + 'start', dom.token, { ...command, expectedRelationshipSessionId: randomUUID() }), 'STALE_RELATIONSHIP_SESSION');
      denied(await req('POST', endpoint + 'start', sub.token, { ...command, expectedRelationshipId: randomUUID() }), 'STALE_RELATIONSHIP');
      denied(await req('POST', endpoint + 'start', service, command), 'AUTHENTICATION_REQUIRED');
      denied(await rpc(dom, 'begin_account_deletion', { p_actor: dom.id, p_command_id: command.commandId, p_expected_relationship_id: period, p_expected_relationship_session_id: di.relationship_session_id, p_recovery_hash: hash }));
      assert.equal((await rows('account_deletion_jobs', `id=eq.${command.commandId}`)).length, 0);
    });
    // Real native endpoint, then legacy-owned Storage API bytes. No managed
    // metadata writes: the short-lived local fixture subject token establishes owner.
    const form = new FormData(); form.append('uploadId', randomUUID()); form.append('expectedRelationshipId', period); form.append('expectedRelationshipSessionId', di.relationship_session_id); form.append('file', new File([png], 'fixture.png', { type: 'image/png' }));
    const native = ok(await req('POST', '/functions/v1/message-media', dom.token, form));
    assert.equal(ok(await req('POST', '/functions/v1/message-media', dom.token, form)).attachmentId,native.attachmentId,'Normal same-upload retry must retain attachment');
    ok(await send(dom, di, native.attachmentId, 'Synthetic shared native photo'));
    const nativeBefore = (await rows('message_attachments', `id=eq.${native.attachmentId}`))[0];
    const nativeOwner = (await e.storageMetadata(nativeBefore.bucket_id, nativeBefore.object_path))[0]; assert.equal(nativeOwner.owner, null); assert.equal(nativeOwner.owner_id, null);
    const legacyPath = `${dom.id}/${randomUUID()}.png`, selfPath = `${dom.id}/${randomUUID()}.png`, cardPath = `${dom.id}/${randomUUID()}.png`;
    const legacyToken = await e.ownerToken(dom.id);
    for (const [bucket, path] of [['message_images', legacyPath], ['message_images', selfPath], ['rules', cardPath]]) {
      ok(await req('POST', `/storage/v1/object/${bucket}/${path}`, legacyToken, png, { 'Content-Type': 'image/png', 'x-upsert': 'false' }));
      const metadata = (await e.storageMetadata(bucket, path))[0]; assert.ok(metadata); assert.equal(metadata.owner_id ?? metadata.owner, dom.id, 'Actual source ownership must be synthetic actor');
    }
    const legacyAttachment = randomUUID(), selfAttachment = randomUUID(), legacyMessage = randomUUID(), selfMessage = randomUUID(), selfConversation = randomUUID();
    ok(await req('POST', '/rest/v1/message_conversations', service, { id: selfConversation, relationship_id: period, kind: 'legacy_self', member_a: di.participant_id }));
    for (const [messageId, attachmentId, path, convo, receiver, receiverParticipant] of [[legacyMessage, legacyAttachment, legacyPath, conversation, sub.id, si.participant_id], [selfMessage, selfAttachment, selfPath, selfConversation, dom.id, di.participant_id]]) {
      ok(await req('POST', '/rest/v1/messages', service, { id: messageId, sender_id: dom.id, receiver_id: receiver, content: 'Synthetic retained legacy photo', relationship_id: period,
        conversation_id: convo, sender_participant_id: di.participant_id, receiver_participant_id: receiverParticipant, provenance: 'legacy_messages', read_status_known: true }));
      ok(await req('POST', '/rest/v1/message_attachments', service, { id: attachmentId, uploader_participant_id: di.participant_id, relationship_id: period, bucket_id: 'message_images', object_path: path,
        mime_type: 'image/png', byte_size: png.length, sha256: hash, status: 'ready', verification_kind: 'baseline_manifest', verified_at: new Date().toISOString(), message_id: messageId }));
      ok(await req('PATCH', `/rest/v1/messages?id=eq.${messageId}`, service, { attachment_id: attachmentId }));
    }
    ok(await req('PATCH', `/rest/v1/rules?id=eq.${state.definitions.rule.id}&relationship_id=eq.${period}`, service, { background_image_url: `${e.api}/storage/v1/object/public/rules/${cardPath}` }));
    // Known old handler paused after begin/claim but before its actual Storage POST.
    const pending = ok(await rpc(null, 'message_media_begin', { p_actor: dom.id, p_upload_id: randomUUID(), ...scope(di), p_mime_type: 'image/png', p_byte_size: png.length, p_sha256: hash }));
    let pendingLease = ok(await rpc(null, 'message_media_claim_upload', { p_actor: dom.id, p_attachment_id: pending.attachmentId }));
    assert.ok(pendingLease.upload);
    const expiredToken=pendingLease.leaseToken;
    denied(await rpc(null,'message_media_claim_upload',{p_actor:dom.id,p_attachment_id:pending.attachmentId}));
    ok(await req('PATCH',`/rest/v1/message_upload_claims?attachment_id=eq.${pending.attachmentId}&actor_user_id=eq.${dom.id}`,service,{lease_until:'2000-01-01T00:00:00Z'}));
    pendingLease=ok(await rpc(null,'message_media_claim_upload',{p_actor:dom.id,p_attachment_id:pending.attachmentId}));
    assert.notEqual(pendingLease.leaseToken,expiredToken);
    denied(await req('POST',`/storage/v1/object/message-media/${pending.objectPath}`,service,png,{'Content-Type':'image/png','x-metadata':Buffer.from(JSON.stringify({uploadLeaseToken:expiredToken})).toString('base64')}));
    const survivorBalance=(await rows('action_wallets',`relationship_id=eq.${period}&participant_id=eq.${si.participant_id}`))[0].balance;
    const historyBefore = {};
    for (const table of ['tasks', 'rewards', 'rules', 'punishments', 'task_completion_history', 'reward_usage', 'rule_violations', 'punishment_history', 'action_events', 'action_point_entries', 'reward_inventory_lots']) historyBefore[table] = await rows(table, `relationship_id=eq.${period}`);
    let prepared;
    await t.test('preparation freezes only initiating actor and preserves survivor values', async () => {
      prepared = ok(await req('POST', endpoint + 'start', dom.token, command)); assert.equal(prepared.state, 'pending');
      assert.deepEqual(ok(await req('POST', endpoint + 'start', dom.token, command)), prepared);
      denied(await req('POST', endpoint + 'start', dom.token, { ...command, recoveryToken: randomBytes(32).toString('base64url') }), 'DELETION_COMMAND_ID_REUSED');
      denied(await rpc(dom, 'get_my_identity')); denied(await rpc(dom, 'get_my_push_device',{p_device_id:randomUUID()}));
      denied(await rpc(dom, 'register_my_push_device', { p_device_id: randomUUID(), p_endpoint: 'https://example.invalid/push', p_p256dh: 'A'.repeat(87), p_auth: 'A'.repeat(22), p_vapid_key_id: 'test' }));
      denied(await send(dom, di, null, 'must never arrive'));
      denied(await req('POST', `/storage/v1/object/avatars/${dom.id}/${randomUUID()}.png`, dom.token, png, { 'Content-Type': 'image/png' }));
      const after = await identity(sub); assert.equal(after.status, 'ready_solo'); assert.equal((await rows('action_wallets',`relationship_id=eq.${after.relationship_id}&participant_id=eq.${after.participant_id}`))[0].balance,survivorBalance);
      for (const [table, beforeRows] of Object.entries(historyBefore)) {
        const afterRows = await rows(table, `relationship_id=eq.${period}`);
        assert.equal(afterRows.length, beforeRows.length, `${table} survivor rows lost`);
        const normalized=list=>list.map(({user_id,...row})=>JSON.stringify(row)).sort();assert.deepEqual(normalized(afterRows),normalized(beforeRows),`${table} values changed beyond detached owner`);
      }
    });
    await t.test('overlapping participant waits; prepared pending path permanently rejects late upload', async () => {
      denied(await req('POST', endpoint + 'start', sub.token, makeCommand(await identity(sub))), 'DELETION_BUSY');
      const late = await req('POST', `/storage/v1/object/message-media/${pending.objectPath}`, service, png, { 'Content-Type': 'image/png', 'x-metadata': Buffer.from(JSON.stringify({ uploadLeaseToken: pendingLease.leaseToken })).toString('base64') }); denied(late);
      assert.equal((await e.storageMetadata('message-media', pending.objectPath)).length, 0);
      // Advance only this exact fixture's wait boundary, not production clocks or
      // fence state; it models expired in-flight lease while frozen path remains.
      ok(await req('PATCH', `/rest/v1/account_deletion_objects?job_id=eq.${command.commandId}`, service, { available_after: '2000-01-01T00:00:00Z' }));
    });
    async function complete(c,loseAuthResponse=false) {
      for (let attempt = 0; attempt < 30; attempt++) {
        if(loseAuthResponse && !(await rows('account_deletion_objects',`job_id=eq.${c.commandId}&state=neq.removed`)).length){
          const claim=ok(await rpc(null,'claim_account_deletion',{p_job_id:c.commandId,p_recovery_hash:createHash('sha256').update(c.recoveryToken).digest('hex')}));
          assert.equal(claim.work.kind,'account');await e.own(claim.work.actorUserId);
          ok(await req('DELETE',`/auth/v1/admin/users/${claim.work.actorUserId}`)); // Deliberately omit job finalization.
          assert.notEqual(ok(await req('POST',endpoint+'status','',recovery(c))).state,'complete');
          ok(await req('PATCH',`/rest/v1/account_deletion_jobs?id=eq.${c.commandId}`,service,{lease_until:'2000-01-01T00:00:00Z'}));
          loseAuthResponse=false;
        }
        const result = ok(await req('POST', endpoint + 'resume', '', recovery(c)));
        if (result.state === 'complete') return result;
        assert.notEqual(result.state, 'retry_required', 'Deletion unexpectedly requires review; preserve fixture evidence');
        // One request processes one durable external step. No busy polling.
        await delay(Math.min(result.retryAfterMs, 2000));
      }
      assert.fail('Deletion did not complete within bounded steps');
    }
    await t.test('real Auth removal and repeated exact capability completion preserve readable survivor photos', async () => {
      const finished = await complete(command); assert.equal(finished.phase, 'complete');
      assert.deepEqual(ok(await req('POST', endpoint + 'resume', '', recovery(command))), finished);
      assert.deepEqual(ok(await req('POST', endpoint + 'status', '', recovery(command))), finished);
      denied(await req('POST', endpoint + 'status', '', { ...recovery(command), recoveryToken: randomBytes(32).toString('base64url') }), 'DELETION_UNAVAILABLE');
      assert.equal((await req('GET', `/auth/v1/admin/users/${dom.id}`)).status, 404);
      for (const attachment of [native.attachmentId, legacyAttachment]) {
        const photo = await req('GET', `/functions/v1/message-media/${attachment}`, sub.token); assert.equal(photo.status, 200); assert.equal(createHash('sha256').update(photo.bytes).digest('hex'), hash);
        denied(await req('GET', `/functions/v1/message-media/${attachment}`, dom.token));
      }
      denied(await req('GET', `/functions/v1/message-media/${selfAttachment}`, sub.token));
      assert.equal((await rows('messages', `id=eq.${selfMessage}`)).length, 0);
      assert.equal((await e.storageMetadata('message_images', legacyPath)).length, 0); assert.equal((await e.storageMetadata('message_images', selfPath)).length, 0);
      const retained = (await rows('message_attachments', `id=eq.${legacyAttachment}`))[0]; assert.equal(retained.bucket_id, 'message-media');
      const metadata = (await e.storageMetadata(retained.bucket_id, retained.object_path))[0]; assert.equal(metadata.owner, null); assert.equal(metadata.owner_id, null);
      const card = (await rows('retained_account_media', `source_bucket=eq.rules&source_path=eq.${encodeURIComponent(cardPath)}`))[0]; assert.ok(card); assert.equal(card.sha256, hash);
      const bytes = await req('GET', `/storage/v1/object/authenticated/${card.bucket_id}/${card.object_path}`); assert.equal(createHash('sha256').update(bytes.bytes).digest('hex'), hash);
      denied(await req('GET', `/storage/v1/object/authenticated/${card.bucket_id}/${card.object_path}`, sub.token));
      const current = await identity(sub), summaries = ok(await rpc(sub, 'get_my_conversations', scope(current)));
      assert.equal(summaries.conversations.find(x => x.id === conversation).label, 'Deleted account');
      const history = ok(await rpc(sub, 'get_my_retained_activity_history', { ...scope(current), p_retained_relationship_id: period, p_domain: 'reward' }));
      assert.ok(!JSON.stringify(history).includes(dom.id) && !JSON.stringify(history).includes(dom.email));
      const late = await req('POST', `/storage/v1/object/message-media/${pending.objectPath}`, service, png, { 'Content-Type': 'image/png', 'x-metadata': Buffer.from(JSON.stringify({ uploadLeaseToken: pendingLease.leaseToken })).toString('base64') }); denied(late);
      await fixtureCommand('verify');
    });
    await t.test('last survivor deletion removes private-only graph and preserved assets', async () => {
      const second = makeCommand(await identity(sub)); ok(await req('POST', endpoint + 'start', sub.token, second)); await complete(second,true);
      assert.equal((await rows('relationship_periods', `id=eq.${period}`)).length, 0);
      assert.equal((await rows('message_attachments', `id=in.(${native.attachmentId},${legacyAttachment})`)).length, 0);
      assert.equal((await rows('retained_account_media')).filter(x => x.relationship_ids.includes(period)).length, 0);
      assert.equal((await req('GET', `/auth/v1/admin/users/${sub.id}`)).status, 404);
      await fixtureCommand('verify');
    });
  } finally {
    // Operator cleanup is not evidence that the product endpoint completed. It
    // retains1400's Auth guard and removes only separately proven fixture graph.
    if (created) await fixtureCommand('cleanup');
  }
});
