/** PREPARED ONLY. Parent runs after browser fixture cleanup on the exclusive
 * pinned local runtime. No imports perform I/O. No SQL, direct Auth cleanup,
 * managed Storage mutation, notification delivery or original activation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, rename, lstat } from 'node:fs/promises';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
const statusFile = process.env.OBEDIENCE_LOCAL_STATUS_FILE;
const enabled = statusFile && process.env.OBEDIENCE_ACCOUNT_DELETION_EXTRA_REVIEWED === '1';
const baseline = new URL('../../../planning/operations/baseline/', import.meta.url);
const tables = ['admin_document_readers','app_guide_content','archived_messages','encyclopedia_entries','messages','profiles','punishment_history','punishments',
  'reward_usage','rewards','rule_violations','rules','task_completion_history','tasks','user_color_schemes','user_notification_preferences','user_push_subscriptions','user_roles',
  'wellbeing_snapshots','wellness_reminders','relationship_periods','relationship_period_members','identity_contexts','partner_link_invitations','action_accounting_periods',
  'action_events','action_wallets','action_point_entries','reward_inventory_lots','action_inventory_movements','action_command_receipts','action_feedback_outbox',
  'action_task_openings','action_feedback_acknowledgments','runtime_probe','message_conversations','message_attachments','message_legacy_sources','message_legacy_quarantine',
  'message_media_configuration','notification_configuration','notification_jobs','notification_deliveries','solo_role_change_receipts','account_deletion_jobs','account_deletion_objects',
  'retained_account_media','message_upload_claims'];
const uuid = x => typeof x === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
const canonical = x => Array.isArray(x) ? x.map(canonical) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, canonical(x[k])])) : x;
const digest = x => createHash('sha256').update(JSON.stringify(x.map(canonical).map(JSON.stringify).sort())).digest('hex');
const png = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==','base64'));
const imageHash = createHash('sha256').update(png).digest('hex');
async function privateJson(path) { const info = await lstat(path); assert.ok(info.isFile() && !info.isSymbolicLink()); assert.equal(info.mode & 0o777,0o600); return JSON.parse(await readFile(path,'utf8')); }

test('independent deletion jobs progress and recreated/new partner cannot inherit retained access', {
  skip: enabled ? false : 'Prepared only: requires pinned private status, explicit reviewed flag and exclusive runtime.', timeout: 480000,
}, async t => {
  process.umask(0o077);
  const runtime = await privateJson(statusFile); assert.equal(runtime.runtime,'native'); assert.equal(runtime.env.API_URL,'http://127.0.0.1:28622');
  const db = new URL(runtime.env.DB_URL); assert.equal(db.hostname,'127.0.0.1'); assert.equal(db.port,'20324');
  const browser = await privateJson(new URL('real-app-browser-fixture.private.json',baseline)); assert.equal(browser.phase,'cleaned','Normal browser fixture must be cleaned first');
  const api=runtime.env.API_URL,service=runtime.env.SERVICE_ROLE_KEY,anon=runtime.env.ANON_KEY; assert.ok(service&&anon);
  async function req(method,path,token=service,body) {
    assert.match(path,/^\/(auth|rest|storage|functions)\/v1\//); const url=new URL(path,api); assert.equal(url.origin,api);
    const r=await fetch(url,{method,redirect:'error',signal:AbortSignal.timeout(55000),headers:{apikey:token===service?service:anon,...(token?{Authorization:`Bearer ${token}`} : {}),
      ...(body instanceof FormData?{}:{'Content-Type':'application/json'}),Prefer:'return=representation'},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});
    const bytes=new Uint8Array(await r.arrayBuffer());let data=null;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{}
    return {status:r.status,data,bytes};
  }
  const ok=r=>{assert.ok(r.status>=200&&r.status<300,`Local request failed (${r.status},${r.data?.error?.code??r.data?.code??'unknown'})`);return r.data;};
  const denied=(r,code)=>{assert.ok(r.status>=400,'Expected access rejection');if(code)assert.equal(r.data?.error?.code??r.data?.message,code);};
  async function rows(table,filter='') { assert.ok(tables.includes(table));const all=[];for(let offset=0;;offset+=200){const page=ok(await req('GET',`/rest/v1/${table}?select=*&limit=200&offset=${offset}${filter?`&${filter}`:''}`));all.push(...page);if(page.length<200)return all;} }
  async function authRows(){const all=[];for(let page=1;;page++){const batch=ok(await req('GET',`/auth/v1/admin/users?page=${page}&per_page=200`)).users;all.push(...batch);if(batch.length<200)return all;}}
  const endpoint='/functions/v1/account-deletion/';
  denied(await req('POST',endpoint+'status','',{jobId:randomUUID(),recoveryToken:randomBytes(32).toString('base64url')}),'DELETION_UNAVAILABLE');
  assert.equal((await rows('account_deletion_jobs')).some(j=>j.phase!=='complete'),false,'Another deletion is active');
  assert.equal((await rows('identity_contexts')).some(x=>x.lifecycle_ready),false,'Another lifecycle fixture is active');
  assert.equal((await rows('action_accounting_periods')).some(x=>x.accounting_enabled),false,'Another accounting fixture is active');
  assert.equal((await rows('notification_configuration')).some(x=>x.delivery_enabled),false);
  const before={auth:await authRows(),buckets:ok(await req('GET','/storage/v1/bucket')),tables:{}};
  for(const table of tables)before.tables[table]=await rows(table);
  const originalIds=new Set(before.auth.map(x=>x.id)), originalPeriods=new Set(before.tables.relationship_periods.map(x=>x.id));
  const originalParticipants=new Set(before.tables.relationship_period_members.map(x=>x.participant_id));
  const runId=randomUUID(), manifestFile=new URL(`account-deletion-extra-${runId}.private.json`,baseline);
  const state={version:1,runId,api,databasePort:'20324',phase:'preparing',accounts:[],periods:[],participants:[],jobs:[],objectIds:[],messageIds:[],attachmentIds:[],storage:[],before};
  await writeFile(manifestFile,JSON.stringify(state),{mode:0o600,flag:'wx'});
  async function save(){const tmp=new URL(`.deletion-extra-${randomUUID()}.tmp`,baseline);await writeFile(tmp,JSON.stringify(state),{mode:0o600,flag:'wx'});await rename(tmp,manifestFile);}
  const ownIds=()=>new Set(state.accounts.map(x=>x.id).filter(Boolean)); const ownPeriods=()=>new Set(state.periods);
  const jobIds=()=>new Set(state.jobs.map(x=>x.command.commandId));
  function own(a){assert.ok(a&&uuid(a.id)&&state.accounts.includes(a)&&!originalIds.has(a.id),'Target must be a recorded new synthetic account');}
  function trackPeriod(id){assert.ok(uuid(id)&&!originalPeriods.has(id),'Refusing original period');if(!state.periods.includes(id))state.periods.push(id);}
  const rpc=(a,name,body={})=>{if(a)own(a);return req('POST',`/rest/v1/rpc/${name}`,a?.token??service,body);};
  const scope=i=>({p_expected_relationship_id:i.relationship_id,p_expected_relationship_session_id:i.relationship_session_id});
  const recovery=j=>({jobId:j.command.commandId,recoveryToken:j.command.recoveryToken});
  async function identity(a){own(a);const i=ok(await rpc(a,'get_my_identity'));assert.equal(i.user_id,a.id);trackPeriod(i.relationship_id);assert.ok(!originalParticipants.has(i.participant_id));if(!state.participants.includes(i.participant_id))state.participants.push(i.participant_id);await save();return i;}
  async function signIn(a){own(a);const session=ok(await req('POST','/auth/v1/token?grant_type=password',anon,{email:a.email,password:a.password}));assert.equal(session.user.id,a.id);a.token=session.access_token;await save();}
  async function createAccount(label,role,predecessor){
    assert.ok(['original','survivor','independent','recreated'].includes(label));assert.ok(!state.accounts.some(a=>a.label===label));
    if(predecessor){own(predecessor);assert.equal((await req('GET',`/auth/v1/admin/users/${predecessor.id}`)).status,404);}
    const a={label,role,email:predecessor?.email??`obedience-delete-extra-${runId}-${label}@example.invalid`,password:randomBytes(24).toString('base64url'),id:null,predecessorId:predecessor?.id??null};
    state.accounts.push(a);await save(); // Exact email/intent survives a lost creation response.
    const created=ok(await req('POST','/auth/v1/admin/users',service,{email:a.email,password:a.password,email_confirm:true,user_metadata:{role}}));
    assert.ok(uuid(created.id)&&!originalIds.has(created.id)&&!ownIds().has(created.id));a.id=created.id;await save();await signIn(a);
    const i=await identity(a);ok(await rpc(a,'set_my_timezone',{p_timezone:'UTC'}));
    const members=await rows('relationship_period_members',`relationship_id=eq.${i.relationship_id}`);assert.equal(members.length,1);assert.equal(members[0].user_id,a.id);
    ok(await rpc(null,'activate_action_accounting',{p_relationship_id:i.relationship_id}));
    ok(await req('PATCH',`/rest/v1/identity_contexts?user_id=eq.${a.id}`,service,{lifecycle_ready:true}));return a;
  }
  async function link(a,b){const invitation=ok(await rpc(a,'generate_partner_link_code',{...scope(await identity(a)),p_mode:'fresh',p_previous_relationship_id:null}));
    const linked=ok(await rpc(b,'accept_partner_link_code',{...scope(await identity(b)),p_code:invitation.code,p_mode:'fresh',p_previous_relationship_id:null}));trackPeriod(linked.relationship_id);await identity(a);await identity(b);return linked.relationship_id;}
  async function upload(a,i){const form=new FormData();form.append('uploadId',randomUUID());form.append('expectedRelationshipId',i.relationship_id);form.append('expectedRelationshipSessionId',i.relationship_session_id);form.append('file',new File([png],'synthetic.png',{type:'image/png'}));
    const media=ok(await req('POST','/functions/v1/message-media',a.token,form));assert.ok(uuid(media.attachmentId));state.attachmentIds.push(media.attachmentId);
    const [row]=await rows('message_attachments',`id=eq.${media.attachmentId}`);assert.ok(row&&ownPeriods().has(row.relationship_id));assert.equal(row.bucket_id,'message-media');state.storage.push({bucket:row.bucket_id,path:row.object_path,attachmentId:row.id});await save();return media;}
  async function start(a){own(a);const i=await identity(a),command={commandId:randomUUID(),expectedRelationshipId:i.relationship_id,expectedRelationshipSessionId:i.relationship_session_id,recoveryToken:randomBytes(32).toString('base64url')};
    const job={actorId:a.id,command};state.jobs.push(job);await save();const result=ok(await req('POST',endpoint+'start',a.token,command));assert.equal(result.state,'pending');await discover();return job;}
  async function discover(){
    const users=await authRows();for(const a of state.accounts)if(!a.id){const matches=users.filter(u=>u.email===a.email&&!ownIds().has(u.id));assert.ok(matches.length<=1);if(matches.length){assert.ok(!originalIds.has(matches[0].id));a.id=matches[0].id;}}
    for(const id of ownIds()){assert.ok(!originalIds.has(id));for(const row of [...await rows('relationship_period_members',`user_id=eq.${id}`),...await rows('identity_contexts',`user_id=eq.${id}`)])trackPeriod(row.relationship_id);}
    for(const period of ownPeriods()){const members=await rows('relationship_period_members',`relationship_id=eq.${period}`);for(const m of members){assert.ok(!originalParticipants.has(m.participant_id));assert.ok(m.user_id===null?state.participants.includes(m.participant_id):ownIds().has(m.user_id),'Unrelated participant entered fixture graph');if(!state.participants.includes(m.participant_id))state.participants.push(m.participant_id);}}
    for(const job of await rows('account_deletion_jobs'))if(jobIds().has(job.id)){assert.ok(ownPeriods().has(job.expected_period_id));assert.ok(job.affected_period_ids.every(p=>ownPeriods().has(p)));assert.ok(job.actor_user_id===null||ownIds().has(job.actor_user_id));}
    for(const object of await rows('account_deletion_objects'))if(jobIds().has(object.job_id)){assert.ok(!before.tables.account_deletion_objects.some(x=>x.id===object.id));if(!state.objectIds.includes(object.id))state.objectIds.push(object.id);}
    for(const message of await rows('messages'))if(ownPeriods().has(message.relationship_id)&&!state.messageIds.includes(message.id))state.messageIds.push(message.id);
    for(const p of await rows('profiles'))if(ownIds().has(p.id)||ownIds().has(p.linked_partner_id))assert.ok(ownIds().has(p.id)&&(p.linked_partner_id===null||ownIds().has(p.linked_partner_id)),'Unrelated profile linked to fixture');
    await save();
  }
  function isOwn(table,row){const ids=ownIds(),periods=ownPeriods();
    if(table==='account_deletion_jobs')return jobIds().has(row.id);
    if(table==='account_deletion_objects')return jobIds().has(row.job_id);
    if(table==='retained_account_media')return state.objectIds.includes(row.id)&&row.relationship_ids.length>0&&row.relationship_ids.every(p=>periods.has(p));
    if(table==='message_legacy_sources')return state.messageIds.includes(row.canonical_message_id);
    if(table==='message_legacy_quarantine')return row.source_table==='messages'&&state.messageIds.includes(row.source_id);
    if(table==='notification_jobs')return ids.has(row.recipient_user_id)&&(!row.relationship_id||periods.has(row.relationship_id));
    if(table==='notification_deliveries')return false; // No real delivery is authorized.
    return table==='profiles'&&ids.has(row.id)||table==='relationship_periods'&&periods.has(row.id)||periods.has(row.relationship_id)||ids.has(row.user_id)||ids.has(row.actor_user_id)||ids.has(row.sender_id)||ids.has(row.receiver_id);
  }
  async function verify(stage){await discover();for(const table of tables)assert.equal(digest((await rows(table)).filter(row=>!isOwn(table,row))),digest(before.tables[table]),`Protected rows changed in ${table}`);
    assert.equal(digest((await authRows()).filter(x=>!ownIds().has(x.id))),digest(before.auth),'Protected Auth records changed');assert.equal(digest(ok(await req('GET','/storage/v1/bucket'))),digest(before.buckets),'Protected bucket settings changed');state.lastVerifiedStage=stage;await save();}
  async function complete(job){for(let attempt=0;attempt<80;attempt++){const result=ok(await req('POST',endpoint+'resume','',recovery(job)));if(result.state==='complete')return result;assert.notEqual(result.state,'retry_required','Unexpected unresolved deletion; private manifest retains exact recovery');await delay(Math.min(Math.max(result.retryAfterMs,250),30000));}assert.fail('Bounded deletion continuation exceeded');}
  async function cleanup(){
    state.phase='cleaning';await save();await discover();await verify('before-cleanup');
    // Product deletion first. If a real failure blocks it, preserve the manifest
    // and remaining fixtures for parent recovery instead of bypassing Auth guard.
    for(const job of state.jobs){const status=await req('POST',endpoint+'status','',recovery(job));if(status.status!==404)await complete(job);}
    for(const a of state.accounts){if(!a.id)continue;own(a);if((await req('GET',`/auth/v1/admin/users/${a.id}`)).status===404)continue;
      await signIn(a);await complete(await start(a));}
    await discover();
    for(const a of state.accounts)if(a.id)assert.equal((await req('GET',`/auth/v1/admin/users/${a.id}`)).status,404);
    for(const period of ownPeriods())assert.equal((await rows('relationship_periods',`id=eq.${period}`)).length,0,'Product deletion left a fixture period');
    for(const asset of state.storage){assert.equal(asset.bucket,'message-media');assert.ok(state.attachmentIds.includes(asset.attachmentId));const r=await req('GET',`/storage/v1/object/authenticated/${asset.bucket}/${asset.path}`);assert.ok(r.status===404||r.status===400&&String(r.data?.statusCode)==='404','Product deletion left readable fixture media');}
    // Only durable synthetic completion records remain. No Storage removal here.
    for(const claim of await rows('message_upload_claims'))if(isOwn('message_upload_claims',claim)){assert.ok(ownPeriods().has(claim.relationship_id));assert.equal(claim.state,'frozen');assert.ok(jobIds().has(claim.deletion_job_id));ok(await req('DELETE',`/rest/v1/message_upload_claims?attachment_id=eq.${claim.attachment_id}&deletion_job_id=eq.${claim.deletion_job_id}`));}
    for(const object of await rows('account_deletion_objects'))if(isOwn('account_deletion_objects',object)){assert.equal(object.state,'removed');ok(await req('DELETE',`/rest/v1/account_deletion_objects?id=eq.${object.id}&job_id=eq.${object.job_id}`));}
    for(const job of await rows('account_deletion_jobs'))if(isOwn('account_deletion_jobs',job)){assert.equal(job.phase,'complete');assert.equal(job.actor_user_id,null);ok(await req('DELETE',`/rest/v1/account_deletion_jobs?id=eq.${job.id}`));}
    for(const table of tables)assert.equal((await rows(table)).filter(row=>isOwn(table,row)).length,0,`Fixture rows remain in ${table}`);
    await verify('after-cleanup');state.phase='cleaned';state.cleanedAt=new Date().toISOString();await save();
  }
  async function requiredCase(name,run){
    // node:test records a failed child without rejecting t.test(). These cases
    // depend on prior deletion completion; stop their setup while still cleaning.
    let completed=false,failure;
    await t.test(name,async child=>{try{await run(child);completed=true;}catch(error){failure=error;throw error;}});
    if(!completed)throw failure??new Error('Required acceptance case did not complete');
  }
  try {
    const original=await createAccount('original','dom'),survivor=await createAccount('survivor','sub'),independent=await createAccount('independent','dom');
    const oldPeriod=await link(original,survivor),oi=await identity(original);
    const conversation=ok(await rpc(original,'get_my_conversations',scope(oi))).currentConversationId;
    const shared=await upload(original,oi);
    const sent=ok(await rpc(original,'send_message',{...scope(oi),p_command_id:randomUUID(),p_conversation_id:conversation,p_content:'Synthetic retained shared photo',p_attachment_id:shared.attachmentId}));assert.ok(sent);
    const privateUpload=await upload(original,oi); // Real private-only Storage cleanup work.
    // Model an elapsed completed-upload lease on one exact synthetic path; no live
    // request exists and the deletion fence remains independent of elapsed time.
    ok(await req('PATCH',`/rest/v1/message_upload_claims?attachment_id=eq.${privateUpload.attachmentId}&actor_user_id=eq.${original.id}`,service,{lease_until:'2000-01-01T00:00:00Z'}));
    const taskId=randomUUID(),historyId=randomUUID();
    ok(await req('POST','/rest/v1/tasks',service,{id:taskId,user_id:original.id,relationship_id:oldPeriod,title:'Synthetic retained task',points:3,is_dom_task:true,frequency:'daily',frequency_count:1}));
    ok(await req('POST','/rest/v1/task_completion_history',service,{id:historyId,user_id:original.id,relationship_id:oldPeriod,task_id:taskId,completed_at:'2025-02-03T18:00:00Z'}));
    await verify('before-deletion');
    let first,second;
    await requiredCase('independent jobs hold separate leases and one finishes while another requires retry',async()=>{
      first=await start(original);
      const firstClaim=ok(await rpc(null,'claim_account_deletion',{p_job_id:first.command.commandId,p_recovery_hash:createHash('sha256').update(first.command.recoveryToken).digest('hex')}));assert.equal(firstClaim.work.kind,'storage');
      second=await start(independent);
      const secondClaim=ok(await rpc(null,'claim_account_deletion',{p_job_id:second.command.commandId,p_recovery_hash:createHash('sha256').update(second.command.recoveryToken).digest('hex')}));assert.equal(secondClaim.work.kind,'account');assert.notEqual(firstClaim.work.leaseToken,secondClaim.work.leaseToken);
      const active=(await rows('account_deletion_jobs')).filter(j=>[first.command.commandId,second.command.commandId].includes(j.id));assert.equal(active.length,2);assert.ok(active.every(j=>Date.parse(j.lease_until)>Date.now()));
      ok(await rpc(null,'fail_account_deletion',{p_job_id:first.command.commandId,p_lease_token:firstClaim.work.leaseToken}));
      ok(await rpc(null,'fail_account_deletion',{p_job_id:second.command.commandId,p_lease_token:secondClaim.work.leaseToken}));
      const completed=await complete(second);assert.equal(completed.state,'complete');
      assert.equal(ok(await req('POST',endpoint+'status','',recovery(first))).state,'retry_required');
      denied(await rpc(null,'finish_account_deletion_object',{p_job_id:first.command.commandId,p_lease_token:firstClaim.work.leaseToken,p_object_id:firstClaim.work.objectId}));
      await complete(first);await verify('independent-jobs-complete');
    });
    const replacement=await createAccount('recreated','dom',original);assert.notEqual(replacement.id,original.id);assert.equal(replacement.email,original.email);
    async function deniedPriorAccess(account){const i=await identity(account);
      const summaries=ok(await rpc(account,'get_my_conversations',scope(i)));assert.ok(!summaries.conversations.some(x=>x.id===conversation));
      denied(await rpc(account,'get_conversation_messages',{...scope(i),p_conversation_id:conversation}),'CONVERSATION_NOT_FOUND');
      denied(await req('GET',`/functions/v1/message-media/${shared.attachmentId}`,account.token));
      const periods=ok(await rpc(account,'list_my_retained_activity_periods',scope(i)));assert.ok(!periods.periods.some(p=>p.periodId===oldPeriod));
      denied(await rpc(account,'get_my_retained_activity_history',{...scope(i),p_retained_relationship_id:oldPeriod,p_domain:'task'}),'RETAINED_PERIOD_NOT_FOUND');
      denied(await req('POST',endpoint+'status','',{jobId:first.command.commandId,recoveryToken:randomBytes(32).toString('base64url')}),'DELETION_UNAVAILABLE');
    }
    async function survivorStillReads(){const i=await identity(survivor),summary=ok(await rpc(survivor,'get_my_conversations',scope(i))).conversations.find(x=>x.id===conversation);assert.equal(summary.label,'Deleted account');
      const messages=ok(await rpc(survivor,'get_conversation_messages',{...scope(i),p_conversation_id:conversation}));assert.ok(JSON.stringify(messages).includes(shared.attachmentId));assert.ok(!JSON.stringify(messages).includes(original.id));
      const image=await req('GET',`/functions/v1/message-media/${shared.attachmentId}`,survivor.token);assert.equal(image.status,200);assert.equal(createHash('sha256').update(image.bytes).digest('hex'),imageHash);
      const history=ok(await rpc(survivor,'get_my_retained_activity_history',{...scope(i),p_retained_relationship_id:oldPeriod,p_domain:'task'}));assert.ok(JSON.stringify(history).includes('Synthetic retained task'));assert.ok(!JSON.stringify(history).includes(original.id));}
    await requiredCase('same-email recreated Auth UUID cannot recover prior identity or retained data',async()=>{await deniedPriorAccess(replacement);await survivorStillReads();await verify('recreated-access-denied');});
    await requiredCase('new partner remains excluded while original survivor retains masked photo and history',async()=>{const newPeriod=await link(replacement,survivor);assert.notEqual(newPeriod,oldPeriod);await deniedPriorAccess(replacement);await survivorStillReads();await verify('new-partner-access-denied');});
    state.phase='verified';await save();
  } finally {
    try{await cleanup();}catch(error){state.phase='cleanup_failed';state.failureCode=error?.code??'VERIFICATION_FAILED';await save();throw error;}
    t.diagnostic(`Synthetic extra-case manifest: ${manifestFile.pathname};48 protected tables, full original Auth and bucket definitions unchanged.`);
  }
});
