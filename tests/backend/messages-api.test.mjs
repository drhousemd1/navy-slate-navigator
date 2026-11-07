/** PREPARED ONLY: reviewed0900 + served message-media on the pinned native runtime.
 * Owns disposable fixtures exclusively. No original-account activation, external
 * fetches, legacy media cutover, migration application or notification invocation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { png } from './helpers/message-fixtures.mjs';
const statusFile=process.env.OBEDIENCE_LOCAL_STATUS_FILE;
test('private conversations and authenticated media retain actual participant access',{
  skip:statusFile?false:'Requires reviewed local0900 and served endpoint; no requests made.',timeout:240_000,
},async(t)=>{
  assert.ok(statusFile.startsWith('/'));
  const status=JSON.parse(await readFile(statusFile,'utf8'));
  assert.equal(status.runtime,'native');assert.equal(status.env.API_URL,'http://127.0.0.1:28622');
  assert.equal(new URL(status.env.DB_URL).hostname,'127.0.0.1');assert.equal(new URL(status.env.DB_URL).port,'20324');
  const api=status.env.API_URL,anon=status.env.ANON_KEY,service=status.env.SERVICE_ROLE_KEY;assert.ok(anon&&service);
  const accounts=[],periods=new Set(),fixtureParticipants=new Set(),deletedAccounts=new Set(),legacyIds=new Set(),uploadMappings=[];
  const originals=new Map();
  let originalMediaObjects,originalBuckets;
  const tables=['admin_document_readers','app_guide_content','archived_messages','encyclopedia_entries','messages','profiles',
    'punishment_history','punishments','reward_usage','rewards','rule_violations','rules','task_completion_history','tasks',
    'user_color_schemes','user_notification_preferences','user_push_subscriptions','user_roles','wellbeing_snapshots','wellness_reminders',
    'identity_contexts','relationship_periods','relationship_period_members','partner_link_invitations','action_accounting_periods',
    'action_events','action_wallets','action_point_entries','reward_inventory_lots','action_inventory_movements','action_command_receipts',
    'action_feedback_outbox','action_feedback_acknowledgments','action_task_openings','action_recording_openings','runtime_probe','message_conversations','message_attachments',
    'message_legacy_sources','message_legacy_quarantine','message_media_configuration'];
  const availableTables=new Set(tables);
  const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
  const hash=x=>createHash('sha256').update(JSON.stringify(x.map(canonical).map(JSON.stringify).sort())).digest('hex');
  async function req(method,path,token=service,body){
    const url=new URL(path,api);assert.equal(url.origin,api);assert.match(path,/^\/(auth|rest|storage|functions)\/v1\//);
    const controller=new AbortController();let timer;
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error(`Local ${method} request exceeded12000ms`));},12000);});
    try{return await Promise.race([timeout,(async()=>{
      const multipart=body instanceof FormData;
      const r=await fetch(url,{method,headers:{apikey:token===service?service:anon,Authorization:`Bearer ${token}`,
        ...(!multipart?{'Content-Type':'application/json'}:{}),Prefer:'return=representation'},
        body:body===undefined?undefined:multipart?body:JSON.stringify(body),signal:controller.signal,redirect:'error'});
      const bytes=Buffer.from(await r.arrayBuffer());let data;try{data=bytes.length?JSON.parse(bytes.toString()):null;}catch{data=null;}
      return{status:r.status,data,bytes,headers:r.headers};
    })()]);}finally{clearTimeout(timer);}
  }
  const ok=r=>{assert.ok(r.status>=200&&r.status<300,`HTTP${r.status}: ${r.data?.message??r.data?.error?.code??'none'}`);return r.data;};
  const denied=(r,code)=>{assert.ok(r.status>=400,`Expected denial; received${r.status}`);if(code)assert.equal(r.data?.message??r.data?.error?.code,code);};
  const rows=async(table,query='select=*')=>ok(await req('GET',`/rest/v1/${table}?${query}`));
  async function allRows(table){const result=[];for(let offset=0;;offset+=500){const page=await rows(table,`select=*&limit=500&offset=${offset}`);result.push(...page);if(page.length<500)return result;}}
  async function authIds(){const ids=[];for(let page=1;;page++){const users=ok(await req('GET',`/auth/v1/admin/users?page=${page}&per_page=100`)).users;ids.push(...users.map(x=>x.id));if(users.length<100)return ids.sort();}}
  const rpc=(a,name,body={})=>req('POST',`/rest/v1/rpc/${name}`,a?.token??anon,body);
  const srpc=(name,body={})=>req('POST',`/rest/v1/rpc/${name}`,service,body);
  const scope=i=>({p_expected_relationship_id:i.relationship_id,p_expected_relationship_session_id:i.relationship_session_id});
  function assertFixtureAccount(a){assert.ok(accounts.some(x=>x.id===a.id)&&!originalAuthSet.has(a.id),'Refusing non-fixture Auth account');}
  function trackPeriod(id){assert.ok(typeof id==='string'&&!originalPeriodIds.has(id),'Refusing original relationship period');periods.add(id);return id;}
  async function assertFixturePeriod(id){
    assert.ok(periods.has(id)&&!originalPeriodIds.has(id),'Refusing untracked/original relationship period');
    const members=await rows('relationship_period_members',`relationship_id=eq.${id}&select=participant_id,user_id`);
    assert.ok(members.length>0,'Refusing a period with no verifiable fixture members');
    for(const m of members){assert.ok(!originalParticipantIds.has(m.participant_id),'Refusing original participant');
      assert.ok(m.user_id===null?fixtureParticipants.has(m.participant_id):accounts.some(a=>a.id===m.user_id),'Period contains a non-fixture participant');
      fixtureParticipants.add(m.participant_id);}
  }
  async function identity(a){assertFixtureAccount(a);const i=ok(await rpc(a,'get_my_identity'));
    if(i.relationship_id)trackPeriod(i.relationship_id);
    if(i.participant_id){assert.ok(!originalParticipantIds.has(i.participant_id),'Unexpected original participant');fixtureParticipants.add(i.participant_id);}return i;}
  async function account(role){const email=`message-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('base64url');
    const user=ok(await req('POST','/auth/v1/admin/users',service,{email,password,email_confirm:true,user_metadata:{role}}));
    assert.ok(user.id&&!originalAuthSet.has(user.id)&&!accounts.some(a=>a.id===user.id),'Account creation returned an existing identity');
    const a={id:user.id,token:null};accounts.push(a);a.token=ok(await req('POST','/auth/v1/token?grant_type=password',anon,{email,password})).access_token;
    await identity(a);ok(await rpc(a,'set_my_timezone',{p_timezone:'UTC'}));return a;}
  async function activate(a){const i=await identity(a);assert.equal(i.status,'ready_solo');assert.equal(i.lifecycle_ready,false);
    ok(await srpc('activate_action_accounting',{p_relationship_id:i.relationship_id}));
    ok(await req('PATCH',`/rest/v1/identity_contexts?user_id=eq.${a.id}`,service,{lifecycle_ready:true}));}
  async function link(a,b,mode='fresh',previous){
    const invitation=ok(await rpc(a,'generate_partner_link_code',{...scope(await identity(a)),p_mode:mode,p_previous_relationship_id:previous??null}));
    const i=ok(await rpc(b,'accept_partner_link_code',{...scope(await identity(b)),p_code:invitation.code,p_mode:mode,p_previous_relationship_id:previous??null}));
    trackPeriod(i.relationship_id);if(i.participant_id){assert.ok(!originalParticipantIds.has(i.participant_id),'Unexpected original participant');fixtureParticipants.add(i.participant_id);}return i;
  }
  const list=async a=>ok(await rpc(a,'get_my_conversations',scope(await identity(a))));
  const page=async(a,c,extra={})=>ok(await rpc(a,'get_conversation_messages',{...scope(await identity(a)),p_conversation_id:c,...extra}));
  const payload=(i,c,content,attachment=null)=>({...scope(i),p_command_id:randomUUID(),p_conversation_id:c,p_content:content,p_attachment_id:attachment});
  const send=(a,p)=>rpc(a,'send_message',p);
  const receipt=(a,p)=>rpc(a,'get_my_message_receipt',{p_command_id:p.p_command_id});
  const ack=async(a,c,ids)=>rpc(a,'acknowledge_conversation_messages',{...scope(await identity(a)),p_conversation_id:c,p_message_ids:ids});
  async function legacy(table,data){const id=data.id??randomUUID();legacyIds.add(id);ok(await req('POST',`/rest/v1/${table}`,service,{id,...data}));return id;}
  const uploadForm=(i,id= randomUUID(),bytes=png,mime='image/png')=>{const form=new FormData();form.append('uploadId',id);form.append('expectedRelationshipId',i.relationship_id);
    form.append('expectedRelationshipSessionId',i.relationship_session_id);form.append('file',new Blob([bytes],{type:mime}),'synthetic.png');return form;};
  const media=(a,id)=>req('GET',`/functions/v1/message-media/${id}`,a?.token??anon);
  // Endpoint preflight must pass before creating any fixture, not silently skip media.
  denied(await req('GET',`/functions/v1/message-media/${randomUUID()}`,anon),'AUTHENTICATION_REQUIRED');
  denied(await rpc(null,'get_my_conversations',{p_expected_relationship_id:randomUUID(),p_expected_relationship_session_id:randomUUID()}));
  const originalAuth=await authIds(),originalAuthSet=new Set(originalAuth);
  const originalPeriodIds=new Set((await rows('relationship_periods','select=id')).map(x=>x.id));
  const originalParticipantIds=new Set((await rows('relationship_period_members','select=participant_id')).map(x=>x.participant_id));
  const optionalOpening=await req('GET','/rest/v1/action_recording_openings?select=*&limit=1');
  if(optionalOpening.status===404&&optionalOpening.data?.code==='PGRST205')availableTables.delete('action_recording_openings');
  else ok(optionalOpening);
  for(const table of availableTables)originals.set(table,hash(await allRows(table)));
  originalMediaObjects=ok(await req('POST','/storage/v1/object/list/message-media',service,{prefix:'',limit:1000,offset:0}));
  assert.equal(originalMediaObjects.length,0,'Dedicated local media bucket must initially have no disposable uploads');
  originalBuckets=hash(ok(await req('GET','/storage/v1/bucket')));
  assert.equal((await rows('identity_contexts','select=lifecycle_ready')).some(x=>x.lifecycle_ready),false);
  assert.equal((await rows('action_accounting_periods','select=accounting_enabled')).some(x=>x.accounting_enabled),false);
  let dom,sub,stranger,other,d,s,pair,conversation,nativePayload,nativeReceipt,attachment,selfConversation;
  try{
    dom=await account('dom');sub=await account('sub');stranger=await account('sub');other=await account('dom');
    for(const a of accounts)await activate(a);
    await link(dom,sub);d=await identity(dom);s=await identity(sub);pair=d.relationship_id;
    ok(await req('PATCH',`/rest/v1/profiles?id=eq.${dom.id}`,service,{nickname:'Synthetic Dom',avatar_url:'https://example.invalid/avatar'}));
    conversation=(await list(sub)).currentConversationId;assert.ok(conversation);

    await t.test('RPC reads expose only verified conversation DTOs; raw tables/helpers and deletion fail closed',async()=>{
      const result=await list(sub),current=result.conversations.find(x=>x.id===conversation);assert.equal(current.state,'current');assert.equal(current.canSend,true);
      assert.equal(current.label,'Synthetic Dom');assert.equal(current.partnerAvatarUrl,'https://example.invalid/avatar');
      for(const a of[sub,stranger])for(const table of['messages','archived_messages','message_conversations','message_attachments','message_legacy_sources'])
        denied(await req('GET',`/rest/v1/${table}?select=*`,a.token));
      denied(await rpc(stranger,'get_conversation_messages',{...scope(await identity(stranger)),p_conversation_id:conversation}),'CONVERSATION_NOT_FOUND');
      denied(await rpc(sub,'_messages_summary',{p_actor:dom.id,p_conversation:conversation}));
      denied(await rpc(sub,'message_media_read',{p_actor:dom.id,p_attachment_id:randomUUID()}));
      denied(await rpc(sub,'delete_user_account'),'ACCOUNT_DELETION_INTEGRATION_REQUIRED');
      const serialized=JSON.stringify(result);assert.ok(!serialized.includes(dom.id)&&!serialized.includes(sub.id));
      denied(await rpc(sub,'get_my_conversations',{...scope(s),p_expected_relationship_session_id:randomUUID()}),'STALE_RELATIONSHIP_SESSION');
    });

    await t.test('same-ID concurrent sends are one immutable message; altered payload and forged fields reject',async()=>{
      nativePayload=payload(s,conversation,'Synthetic text');const results=await Promise.all([send(sub,nativePayload),send(sub,nativePayload)]);
      nativeReceipt=ok(results[0]);assert.deepEqual(ok(results[1]),nativeReceipt);assert.deepEqual(ok(await receipt(sub,nativePayload)),nativeReceipt);
      assert.equal(ok(await receipt(dom,nativePayload)),null);
      denied(await send(sub,{...nativePayload,p_content:'Changed'}),'MESSAGE_COMMAND_ID_REUSED');
      denied(await send(sub,{...payload(s,conversation,'Forged'),p_receiver_id:stranger.id}));
      denied(await req('PATCH',`/rest/v1/messages?id=eq.${nativeReceipt.messageId}`,sub.token,{content:'Tampered'}));
      const row=(await rows('messages',`id=eq.${nativeReceipt.messageId}`))[0];assert.equal(row.sender_id,sub.id);assert.equal(row.receiver_id,dom.id);
      assert.equal((await rows('messages',`client_request_id=eq.${nativePayload.p_command_id}&select=id`)).length,1);
      assert.deepEqual(Object.keys(nativeReceipt).sort(),['commandId','confirmedAt','conversationId','messageId']);
    });

    await t.test('legacy self access, exact archive duplicates and ID collisions are handled without widening access',async()=>{
      const common={sender_id:sub.id,receiver_id:sub.id,content:'Synthetic private self',created_at:'2020-01-01T00:00:00Z',relationship_id:pair};
      const self=await legacy('messages',common);await legacy('archived_messages',{id:self,...common});
      await legacy('archived_messages',{id:nativeReceipt.messageId,...common,content:'Different archive content'});
      const invalid=await legacy('archived_messages',{...common,sender_id:stranger.id,content:'Unmappable'});
      ok(await srpc('import_legacy_messages'));
      selfConversation=(await rows('messages',`id=eq.${self}&select=conversation_id`))[0].conversation_id;
      assert.equal((await page(sub,selfConversation)).conversation.label,'Saved self-messages');
      assert.ok((await page(sub,selfConversation)).messages.every(m=>m.author==='you'));
      assert.ok(!(await list(dom)).conversations.some(c=>c.id===selfConversation));
      denied(await rpc(dom,'get_conversation_messages',{...scope(d),p_conversation_id:selfConversation}),'CONVERSATION_NOT_FOUND');
      const sources=await rows('message_legacy_sources',`source_id=eq.${self}&select=canonical_message_id`);assert.equal(sources.length,2);assert.ok(sources.every(x=>x.canonical_message_id===self));
      const conflict=(await rows('message_legacy_sources',`source_table=eq.archived_messages&source_id=eq.${nativeReceipt.messageId}`))[0];assert.notEqual(conflict.canonical_message_id,nativeReceipt.messageId);
      assert.equal((await rows('message_legacy_quarantine',`source_id=eq.${invalid}`)).length,1);
      const before=hash(await rows('messages',`relationship_id=eq.${pair}`));ok(await srpc('import_legacy_messages'));assert.equal(hash(await rows('messages',`relationship_id=eq.${pair}`)),before);
      denied(await srpc('cutover_legacy_message_media'),'LEGACY_MEDIA_CUTOVER_INCOMPLETE');
    });

    await t.test('equal timestamp cursor pages return every message once in ascending display order',async()=>{
      for(let i=0;i<7;i++)await legacy('messages',{sender_id:dom.id,receiver_id:sub.id,content:`Page ${i}`,created_at:'2021-02-03T04:05:06Z',relationship_id:pair});
      ok(await srpc('import_legacy_messages'));
      let cursor={},seen=[];
      for(let i=0;i<20;i++){const result=await page(sub,conversation,{p_limit:3,...cursor});
        const keys=result.messages.map(m=>`${m.createdAt}/${m.id}`);assert.deepEqual(keys,[...keys].sort());seen.push(...result.messages.map(m=>m.id));
        if(!result.nextBefore)break;
        assert.deepEqual(result.nextBefore,{createdAt:result.messages[0].createdAt,messageId:result.messages[0].id});
        cursor={p_before_created_at:result.nextBefore.createdAt,p_before_message_id:result.nextBefore.messageId};
      }
      assert.equal(new Set(seen).size,seen.length);assert.equal(seen.length,(await rows('messages',`conversation_id=eq.${conversation}&select=id`)).length);
      denied(await rpc(sub,'get_conversation_messages',{...scope(s),p_conversation_id:conversation,p_before_created_at:'2021-01-01',p_limit:101}),'MESSAGE_PAGE_INVALID');
    });

    await t.test('acknowledgment touches only listed incoming messages and preserves unseen unread state',async()=>{
      const incoming=ok(await send(dom,payload(d,conversation,'Viewed'))),unseen=ok(await send(dom,payload(d,conversation,'Not viewed')));
      ok(await ack(sub,conversation,[incoming.messageId]));ok(await ack(sub,conversation,[incoming.messageId]));
      denied(await ack(sub,conversation,[nativeReceipt.messageId]),'MESSAGE_ACK_INVALID');
      denied(await ack(sub,conversation,[randomUUID()]),'MESSAGE_ACK_INVALID');
      const result=await page(sub,conversation);assert.equal(result.messages.find(m=>m.id===incoming.messageId).readStatus,'read');
      assert.equal(result.messages.find(m=>m.id===unseen.messageId).readStatus,'unread');
      const archived=(await page(sub,selfConversation)).messages.find(m=>m.provenance==='legacy_archive');assert.equal(archived.readStatus,'unknown');
      // Reimport remains stable after legitimate recipient read markers change.
      ok(await srpc('import_legacy_messages'));
    });

    await t.test('upload validates actual bytes, excludes arbitrary URL/file data, and keeps pending failures private',async()=>{
      denied(await req('POST','/functions/v1/message-media',anon,uploadForm(s)),'AUTHENTICATION_REQUIRED');
      denied(await req('POST','/functions/v1/message-media',sub.token,uploadForm(s,randomUUID(),png,'image/jpeg')),'IMAGE_TYPE_MISMATCH');
      denied(await req('POST','/functions/v1/message-media',sub.token,uploadForm(s,randomUUID(),Buffer.from('<svg/>'),'image/svg+xml')),'IMAGE_TYPE_UNSUPPORTED');
      denied(await req('POST','/functions/v1/message-media',sub.token,uploadForm(s,randomUUID(),Buffer.alloc(5242881),'image/png')),'IMAGE_SIZE_INVALID');
      const fake=uploadForm(s);fake.set('file','http://example.invalid/private');denied(await req('POST','/functions/v1/message-media',sub.token,fake),'UPLOAD_FORM_INVALID');
      const pending=ok(await srpc('message_media_begin',{p_actor:sub.id,p_upload_id:randomUUID(),...scope(s),p_mime_type:'image/png',p_byte_size:png.length,p_sha256:createHash('sha256').update(png).digest('hex')}));
      denied(await srpc('message_media_finalize',{p_actor:sub.id,p_attachment_id:pending.attachmentId,p_sha256:pending.sha256}),'MESSAGE_ATTACHMENT_UNAVAILABLE');
      denied(await media(sub,pending.attachmentId),'MESSAGE_ATTACHMENT_UNAVAILABLE');
    });

    await t.test('same upload retry preserves bytes; unattached is own-only and bound image follows actual conversation participants',async()=>{
      const uploadId=randomUUID();attachment=ok(await req('POST','/functions/v1/message-media',sub.token,uploadForm(s,uploadId)));
      assert.deepEqual(ok(await req('POST','/functions/v1/message-media',sub.token,uploadForm(s,uploadId))),attachment);
      const mapping=ok(await srpc('message_media_read',{p_actor:sub.id,p_attachment_id:attachment.attachmentId}));uploadMappings.push(mapping);
      const own=await media(sub,attachment.attachmentId);assert.equal(own.status,200);assert.deepEqual(own.bytes,png);assert.match(own.headers.get('cache-control'),/no-store/);assert.equal(own.headers.get('location'),null);
      denied(await media(dom,attachment.attachmentId),'MESSAGE_ATTACHMENT_UNAVAILABLE');denied(await media(stranger,attachment.attachmentId),'MESSAGE_ATTACHMENT_UNAVAILABLE');
      for(const route of['public','authenticated'])denied(await req('GET',`/storage/v1/object/${route}/message-media/${mapping.objectPath}`,sub.token));
      const photo=ok(await send(sub,payload(s,conversation,null,attachment.attachmentId)));assert.ok(photo.messageId);
      const peer=await media(dom,attachment.attachmentId);assert.equal(peer.status,200);assert.deepEqual(peer.bytes,png);
      denied(await send(sub,payload(s,conversation,'Reuse',attachment.attachmentId)),'MESSAGE_ATTACHMENT_UNAVAILABLE');
      const dto=(await page(dom,conversation)).messages.find(m=>m.id===photo.messageId);
      assert.deepEqual(dto.attachment,{id:attachment.attachmentId,mimeType:'image/png',byteSize:png.length});
      assert.ok(!JSON.stringify(dto).includes(mapping.objectPath)||mapping.objectPath===attachment.attachmentId);
      assert.ok(!JSON.stringify(dto).includes('bucket')&&!JSON.stringify(dto).includes('sender_id'));
      denied(await srpc('message_media_begin',{p_actor:sub.id,p_upload_id:uploadId,...scope(s),p_mime_type:'image/png',p_byte_size:png.length,p_sha256:'0'.repeat(64)}),'MESSAGE_UPLOAD_ID_REUSED');
    });

    await t.test('Unlink masks identities, preserves participant history/media, and allows only exact confirmed receipt replay',async()=>{
      const unconfirmed=payload(s,conversation,'Never sent');ok(await rpc(sub,'unlink_my_partner',scope(s)));await Promise.all(accounts.map(identity));
      const result=await page(sub,conversation);assert.equal(result.conversation.state,'archived');assert.equal(result.conversation.label,'Former partner');assert.equal(result.conversation.partnerAvatarUrl,null);assert.equal(result.conversation.canSend,false);
      assert.ok(!JSON.stringify(result).includes(dom.id)&&!JSON.stringify(result).includes('Synthetic Dom')&&!JSON.stringify(result).includes('example.invalid/avatar'));
      assert.deepEqual(ok(await send(sub,nativePayload)),nativeReceipt);assert.deepEqual(ok(await receipt(sub,nativePayload)),nativeReceipt);
      denied(await send(sub,unconfirmed),'STALE_RELATIONSHIP');assert.equal(ok(await receipt(sub,unconfirmed)),null);
      assert.equal((await media(dom,attachment.attachmentId)).status,200);
      denied(await send(sub,payload(await identity(sub),conversation,'Archived')),'MESSAGE_PARTNER_REQUIRED');
      await link(dom,sub,'continue',pair);d=await identity(dom);s=await identity(sub);
      assert.notEqual(s.relationship_session_id,nativePayload.p_expected_relationship_session_id);
      assert.equal((await list(sub)).currentConversationId,conversation);assert.equal((await page(sub,conversation)).conversation.label,'Synthetic Dom');
      denied(await send(sub,unconfirmed),'STALE_RELATIONSHIP_SESSION');
      ok(await send(sub,payload(s,conversation,'Current continuation')));
    });

    await t.test('same-pair Fresh and new partners never restore an old identity or inherit earlier conversations',async()=>{
      ok(await rpc(sub,'unlink_my_partner',scope(s)));await Promise.all(accounts.map(identity));await link(dom,sub);d=await identity(dom);s=await identity(sub);
      assert.notEqual((await list(sub)).currentConversationId,conversation);assert.equal((await page(sub,conversation)).conversation.label,'Former partner');
      ok(await rpc(sub,'unlink_my_partner',scope(s)));await Promise.all(accounts.map(identity));await link(other,sub);s=await identity(sub);
      assert.ok(!(await list(other)).conversations.some(x=>x.id===conversation||x.id===selfConversation));
      denied(await rpc(other,'get_conversation_messages',{...scope(await identity(other)),p_conversation_id:conversation}),'CONVERSATION_NOT_FOUND');
      denied(await media(other,attachment.attachmentId),'MESSAGE_ATTACHMENT_UNAVAILABLE');
      assert.equal((await page(sub,conversation)).conversation.label,'Former partner');
    });

    await t.test('retained participant IDs survive synthetic Auth removal and expose only Deleted account',async()=>{
      const before=(await page(sub,conversation)).messages;
      assertFixtureAccount(dom);
      for(const m of await rows('relationship_period_members',`user_id=eq.${dom.id}&select=relationship_id`)){trackPeriod(m.relationship_id);await assertFixturePeriod(m.relationship_id);}
      ok(await req('DELETE',`/auth/v1/admin/users/${dom.id}`,service));deletedAccounts.add(dom.id);
      const result=await page(sub,conversation);assert.equal(result.conversation.label,'Deleted account');assert.equal(result.conversation.partnerAvatarUrl,null);
      assert.deepEqual(result.messages,before);assert.equal((await media(sub,attachment.attachmentId)).status,200);
      const retained=(await rows('messages',`id=eq.${nativeReceipt.messageId}&select=receiver_id,receiver_participant_id`))[0];
      assert.equal(retained.receiver_id,null);assert.ok(retained.receiver_participant_id);
    });

    await t.test('racing send and Unlink serialize into one accepted message or a stale intent with no phantom receipt',async()=>{
      const i=await identity(sub),c=(await list(sub)).currentConversationId,p=payload(i,c,'Race');
      const results=await Promise.all([send(sub,p),rpc(other,'unlink_my_partner',scope(await identity(other)))]);ok(results[1]);
      await Promise.all(accounts.filter(a=>!deletedAccounts.has(a.id)).map(identity));
      if(results[0].status<300){const accepted=ok(results[0]);assert.deepEqual(ok(await receipt(sub,p)),accepted);}
      else{denied(results[0],'STALE_RELATIONSHIP');assert.equal(ok(await receipt(sub,p)),null);}
      assert.equal((await rows('messages',`client_request_id=eq.${p.p_command_id}&select=id`)).length,results[0].status<300?1:0);
    });
  } finally {
    const ids=accounts.map(a=>a.id);
    if(ids.length)for(const m of await rows('relationship_period_members',`user_id=in.(${ids.join(',')})&select=relationship_id`))trackPeriod(m.relationship_id);
    // Storage cleanup uses its API and only opaque keys owned by these fixture periods.
    for(const p of periods){
      await assertFixturePeriod(p);
      const objects=await rows('message_attachments',`relationship_id=eq.${p}&bucket_id=eq.message-media&select=bucket_id,object_path`);
      if(objects.length)ok(await req('DELETE','/storage/v1/object/message-media',service,{prefixes:objects.map(x=>x.object_path)}));
      const messageIds=(await rows('messages',`relationship_id=eq.${p}&select=id`)).map(x=>x.id);
      if(messageIds.length)ok(await req('DELETE',`/rest/v1/message_legacy_sources?canonical_message_id=in.(${messageIds.join(',')})`));
      ok(await req('PATCH',`/rest/v1/messages?relationship_id=eq.${p}`,service,{attachment_id:null}));
      ok(await req('DELETE',`/rest/v1/message_attachments?relationship_id=eq.${p}`));
      ok(await req('DELETE',`/rest/v1/messages?relationship_id=eq.${p}`));
      ok(await req('DELETE',`/rest/v1/archived_messages?relationship_id=eq.${p}`));
      ok(await req('DELETE',`/rest/v1/message_conversations?relationship_id=eq.${p}`));
      for(const table of ['action_feedback_acknowledgments','action_feedback_outbox','action_command_receipts','reward_usage','task_completion_history',
        'rule_violations','punishment_history','action_inventory_movements','action_point_entries','reward_inventory_lots','action_events','action_task_openings','action_recording_openings',
        'action_wallets','action_accounting_periods','rewards','tasks','rules','punishments'].filter(x=>availableTables.has(x)))ok(await req('DELETE',`/rest/v1/${table}?relationship_id=eq.${p}`));
    }
    if(legacyIds.size)ok(await req('DELETE',`/rest/v1/message_legacy_quarantine?source_id=in.(${[...legacyIds].join(',')})`));
    for(const a of accounts)assertFixtureAccount(a);
    for(const a of accounts)if(!deletedAccounts.has(a.id))ok(await req('PATCH',`/rest/v1/profiles?id=eq.${a.id}`,service,{linked_partner_id:null}));
    for(const a of accounts)if(!deletedAccounts.has(a.id))ok(await req('DELETE',`/auth/v1/admin/users/${a.id}`,service));
    for(const p of periods){await assertFixturePeriod(p);ok(await req('DELETE',`/rest/v1/relationship_period_members?relationship_id=eq.${p}`));ok(await req('DELETE',`/rest/v1/relationship_periods?id=eq.${p}`));}
    for(const table of availableTables)assert.equal(hash(await allRows(table)),originals.get(table),`Original ${table} changed`);
    assert.deepEqual(await authIds(),originalAuth,'Original Auth IDs changed');
    assert.deepEqual(ok(await req('POST','/storage/v1/object/list/message-media',service,{prefix:'',limit:1000,offset:0})),originalMediaObjects,'Fixture media objects remain');
    assert.equal(hash(ok(await req('GET','/storage/v1/bucket'))),originalBuckets,'Storage bucket settings changed');
  }
});
