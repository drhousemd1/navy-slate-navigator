/** Reviewed LOCAL migration 0600 only. This harness never applies SQL and never
 * enables an existing account. Requires an explicit pinned runtime status path.
 * All identities are synthetic; credentials and record contents are not logged.
 * Run only after parent review/apply and exclusive release of the fixture runtime.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID, randomBytes, createHash } from 'node:crypto';

const statusFile = process.env.OBEDIENCE_LOCAL_STATUS_FILE;
test('lifecycle accounting transitions and session-bound intentions', {
  skip: statusFile ? false : 'Requires explicit reviewed local runtime; no API requests made.',
  timeout: 180_000,
}, async (t) => {
  assert.ok(statusFile.startsWith('/'));
  const status = JSON.parse(await readFile(statusFile, 'utf8'));
  assert.equal(status.runtime, 'native');
  assert.equal(status.env.API_URL, 'http://127.0.0.1:28622');
  assert.equal(new URL(status.env.DB_URL).hostname, '127.0.0.1');
  assert.equal(new URL(status.env.DB_URL).port, '20324');
  const api=status.env.API_URL, anon=status.env.ANON_KEY, service=status.env.SERVICE_ROLE_KEY;
  assert.ok(anon && service);
  const accounts=[], periods=new Set(), originals=new Map();
  const tables=['admin_document_readers','app_guide_content','archived_messages','encyclopedia_entries','messages',
    'profiles','punishment_history','punishments','reward_usage','rewards','rule_violations','rules','task_completion_history','tasks',
    'user_color_schemes','user_notification_preferences','user_push_subscriptions','user_roles','wellbeing_snapshots','wellness_reminders',
    'identity_contexts','relationship_periods','relationship_period_members','partner_link_invitations',
    'action_accounting_periods','action_events','action_wallets','action_point_entries','reward_inventory_lots',
    'action_inventory_movements','action_command_receipts','action_feedback_outbox','action_feedback_acknowledgments','action_task_openings'];
  const canon=x=>Array.isArray(x)?x.map(canon):x&&typeof x==='object'
    ?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canon(x[k])])):x;
  const hash=rows=>createHash('sha256').update(JSON.stringify(rows.map(canon).map(JSON.stringify).sort())).digest('hex');
  const diagnostics=process.env.OBEDIENCE_API_DIAGNOSTICS==='1';
  const trace=(phase,detail={})=>{if(diagnostics)console.error(JSON.stringify({phase,at:new Date().toISOString(),...detail}));};
  let requestSequence=0;
  async function req(method,path,token=service,body,sessionId) {
    assert.match(path,/^\/(auth|rest)\/v1\//);
    const url=new URL(path,api); assert.equal(url.origin,api);
    // Endpoint names only: omit query strings, UUIDs, tokens and all payload values.
    const detail={request:++requestSequence,method,endpoint:url.pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi,'[fixture-id]')};
    const started=performance.now(),controller=new AbortController();let timer;
    trace('request-start',detail);
    const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{
      const error=new Error(`Request deadline 12000ms: ${method} ${detail.endpoint}`);
      controller.abort(error);reject(error);
    },12_000);});
    try {
      const result=await Promise.race([deadline,(async()=>{
        const response=await fetch(url,{method,headers:{apikey:token===service?service:anon,Authorization:`Bearer ${token}`,
          'Content-Type':'application/json',Prefer:'return=representation',...(sessionId?{'x-relationship-session-id':sessionId}:{})},
          body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,redirect:'error'});
        const text=await response.text();let data;try{data=text?JSON.parse(text):null;}catch{data=null;}
        return {status:response.status,data};
      })()]);
      trace('request-end',{...detail,status:result.status,elapsedMs:Math.round(performance.now()-started)});
      return result;
    } catch(error) {
      trace('request-error',{...detail,errorName:error.name,elapsedMs:Math.round(performance.now()-started)});
      throw error;
    } finally {clearTimeout(timer);}
  }
  const ok=r=>{assert.ok(r.status>=200&&r.status<300,`API status ${r.status}; code ${r.data?.code??'none'}; message ${r.data?.message??'none'}`);return r.data;};
  const denied=(r,message)=>{assert.ok(r.status>=400,`Expected rejection, got ${r.status}`);if(message)assert.equal(r.data?.message,message);};
  const rows=async(table,query='select=*',token=service)=>ok(await req('GET',`/rest/v1/${table}?${query}`,token));
  async function allRows(table) {
    const result=[]; for(let offset=0;;offset+=500){const page=await rows(table,`select=*&limit=500&offset=${offset}`);result.push(...page);if(page.length<500)return result;}
  }
  async function authIds(){const result=[];for(let page=1;;page++){const data=ok(await req('GET',`/auth/v1/admin/users?page=${page}&per_page=100`));result.push(...data.users.map(u=>u.id));if(data.users.length<100)return result.sort();}}
  const rpc=(a,name,body={})=>req('POST',`/rest/v1/rpc/${name}`,a?.token??anon,body);
  async function identity(a){const result=ok(await rpc(a,'get_my_identity'));if(result.relationship_id)periods.add(result.relationship_id);return result;}
  const scope=i=>({p_expected_relationship_id:i.relationship_id,p_expected_relationship_session_id:i.relationship_session_id});
  async function createAccount(role,balance=0){
    const email=`lifecycle-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('base64url');
    const user=ok(await req('POST','/auth/v1/admin/users',service,{email,password,email_confirm:true,user_metadata:role?{role}:{}}));
    const a={id:user.id,token:null};accounts.push(a);
    a.token=ok(await req('POST','/auth/v1/token?grant_type=password',anon,{email,password})).access_token;
    let i=await identity(a);
    if(i.role){
      ok(await rpc(a,'set_my_timezone',{p_timezone:i.role==='dom'?'Pacific/Kiritimati':'America/Boise'}));
      ok(await req('PATCH',`/rest/v1/profiles?id=eq.${a.id}`,service,i.role==='dom'?{dom_points:balance}:{points:balance}));
    }
    return a;
  }
  const ready=async a=>ok(await req('PATCH',`/rest/v1/identity_contexts?user_id=eq.${a.id}`,service,{lifecycle_ready:true}));
  const activate=async a=>ok(await req('POST','/rest/v1/rpc/activate_action_accounting',service,{p_relationship_id:(await identity(a)).relationship_id}));
  const generate=async(a,mode='fresh',previous=null)=>ok(await rpc(a,'generate_partner_link_code',{...scope(await identity(a)),p_mode:mode,p_previous_relationship_id:previous}));
  const accept=async(a,invite)=>ok(await rpc(a,'accept_partner_link_code',{...scope(await identity(a)),p_code:invite.code,p_mode:invite.mode,p_previous_relationship_id:invite.previous_relationship_id}));
  async function link(a,b,mode='fresh',previous=null){const result=await accept(b,await generate(a,mode,previous));periods.add(result.relationship_id);return result;}
  async function unlink(a){const result=ok(await rpc(a,'unlink_my_partner',scope(await identity(a))));await Promise.all(accounts.map(identity));return result;}
  const wallets=async p=>await rows('action_wallets',`relationship_id=eq.${p}&select=*`);
  const balance=async(p,role)=>(await wallets(p)).find(w=>w.currency===role)?.balance;
  // Capture only when forming a NEW intention. Existing replay/stale-session
  // objects below stay frozen; the RPC dispatcher never infers fresh context.
  async function forwardBody(a,i,kind,id){
    const type=kind==='task_complete'?'task':kind==='rule_violation'?'rule':'punishment';
    const reviewed=ok(await rpc(a,type==='task'?'get_task_progress':'get_recording_progress',
      {p_expected_relationship_id:i.relationship_id,...(type==='task'?{p_task_id:id}:{p_subject_type:type,p_subject_id:id})}));
    assert.ok(reviewed.expectedContext);
    return {...scope(i),p_command_id:randomUUID(),p_action:kind,
      ...(type==='task'?{p_task_id:id}:type==='rule'?{p_rule_id:id}:{p_punishment_id:id}),
      p_expected_context:structuredClone(reviewed.expectedContext)};
  }
  const taskCommand=async(a,i,id,extra={})=>rpc(a,'execute_task_command',{...await forwardBody(a,i,'task_complete',id),...extra});
  const rewardCommand=(a,i,id,kind='reward_buy',extra={})=>rpc(a,'execute_reward_command',{...scope(i),p_command_id:randomUUID(),p_action:kind,p_reward_id:id,...extra});
  const undo=(a,i,event)=>rpc(a,'undo_action',{...scope(i),p_command_id:randomUUID(),p_event_id:event});
  async function insert(a,table,body){const i=await identity(a);return ok(await req('POST',`/rest/v1/${table}`,a.token,{user_id:a.id,relationship_id:i.relationship_id,...body},i.relationship_session_id))[0];}
  const ledgerTables=['action_accounting_periods','action_events','action_wallets','action_point_entries','reward_inventory_lots',
    'action_inventory_movements','action_command_receipts','action_feedback_outbox','action_feedback_acknowledgments','action_task_openings',
    'rewards','tasks','rules','punishments','reward_usage','task_completion_history','rule_violations','punishment_history'];
  async function ledger(p){const out={};for(const table of ledgerTables)out[table]=hash(await rows(table,`relationship_id=eq.${p}&select=*`));return out;}
  async function globalDigest(){const out={};for(const table of tables)out[table]=hash(await allRows(table));return out;}

  // Fail before creating any account if the reviewed migration is unavailable.
  await rows('relationship_periods','select=relationship_session_id&limit=0');
  const originalAuth=await authIds();
  for(const table of tables)originals.set(table,hash(await allRows(table)));
  assert.equal((await rows('identity_contexts','select=lifecycle_ready')).some(x=>x.lifecycle_ready),false,'Another lifecycle fixture is active');
  assert.equal((await rows('action_accounting_periods','select=accounting_enabled')).some(x=>x.accounting_enabled),false,'Another accounting fixture is active');
  let dom,sub,other,intruder,setup,pair,oldIdentity,oldDomIdentity,task,domTask,reward,rule,punishment;
  let confirmedPayload,confirmedReceipt,unconfirmedPayload,oldLedger,oldActivation,oldWallets,oldMembers;
  try {
    await t.test('initial role setup and disabled gates remain; only synthetic accounts are activated',async()=>{
      dom=await createAccount('dominant',80);sub=await createAccount('submissive',100);other=await createAccount('sub',15);
      setup=await createAccount();assert.equal((await identity(setup)).status,'missing_profile');
      assert.equal((await identity(setup)).relationship_session_id,null);
      const made=ok(await rpc(setup,'set_my_profile_role',{p_role:'dominant'}));periods.add(made.relationship_id);
      assert.equal(made.status,'ready_solo');assert.equal(made.role,'dom');assert.equal(made.lifecycle_ready,false);
      const d=await identity(dom);assert.equal(d.role,'dom');assert.ok(d.relationship_session_id);
      denied(await rpc(dom,'generate_partner_link_code',{...scope(d),p_mode:'fresh'}),'LIFECYCLE_INTEGRATION_REQUIRED');
      await ready(dom);
      denied(await rpc(dom,'generate_partner_link_code',{...scope(d),p_mode:'fresh'}),'LIFECYCLE_ACCOUNTING_INTEGRATION_REQUIRED');
      await activate(dom);await activate(sub);await activate(other);await ready(sub);await ready(other);
      denied(await rpc(dom,'set_my_profile_role',{p_role:'sub'}),'ROLE_LIFECYCLE_INTEGRATION_REQUIRED');
      assert.equal(ok(await rpc(dom,'set_my_profile_role',{p_role:'dominant'})).role,'dom');
      denied(await rpc(sub,'activate_action_accounting',{p_relationship_id:(await identity(sub)).relationship_id}));
    });

    await t.test('Fresh atomically creates a new zero-balance enabled period and preserves departing solo ledgers',async()=>{
      const d=await identity(dom),s=await identity(sub),beforeD=await ledger(d.relationship_id),beforeS=await ledger(s.relationship_id);
      denied(await rpc(dom,'generate_partner_link_code',{p_expected_relationship_id:d.relationship_id,p_mode:'fresh'}),'STALE_RELATIONSHIP_SESSION');
      const stale={...scope(s),p_expected_relationship_session_id:randomUUID()};
      const invite=await generate(dom);
      denied(await rpc(sub,'accept_partner_link_code',{...stale,p_code:invite.code,p_mode:'fresh'}),'STALE_RELATIONSHIP_SESSION');
      const result=await accept(sub,invite);pair=result.relationship_id;periods.add(pair);
      assert.notEqual(pair,d.relationship_id);assert.notEqual(pair,s.relationship_id);
      assert.equal(result.status,'ready_linked');assert.equal(await balance(pair,'sub'),0);assert.equal(await balance(pair,'dom'),0);
      assert.equal((await rows('action_accounting_periods',`relationship_id=eq.${pair}&select=accounting_enabled`))[0].accounting_enabled,true);
      assert.deepEqual(await ledger(d.relationship_id),beforeD);assert.deepEqual(await ledger(s.relationship_id),beforeS);
      denied(await acceptRaw(sub,invite),'INVALID_LINK_CODE');
    });

    async function acceptRaw(a,invite,extra={}){return rpc(a,'accept_partner_link_code',{...scope(await identity(a)),p_code:invite.code,p_mode:invite.mode,p_previous_relationship_id:invite.previous_relationship_id,...extra});}
    await t.test('new command wrappers preserve exact receipts, currencies, Undo, and direct-edit authorization',async()=>{
      oldIdentity=await identity(sub);oldDomIdentity=await identity(dom);
      task=await insert(sub,'tasks',{title:'Lifecycle Sub task',points:100,frequency:'daily',frequency_count:20,is_dom_task:false});
      domTask=await insert(dom,'tasks',{title:'Lifecycle Dom task',points:80,frequency:'weekly',frequency_count:20,is_dom_task:true});
      reward=await insert(sub,'rewards',{title:'Lifecycle reward',cost:20,supply:0,is_dom_reward:false});
      rule=await insert(sub,'rules',{title:'Lifecycle rule'});
      punishment=await insert(sub,'punishments',{title:'Lifecycle punishment',points:10,dom_points:4});
      confirmedPayload=await forwardBody(sub,oldIdentity,'task_complete',task.id);
      const concurrent=await Promise.all([rpc(sub,'execute_task_command',confirmedPayload),rpc(sub,'execute_task_command',confirmedPayload)]);
      confirmedReceipt=ok(concurrent[0]);assert.deepEqual(ok(concurrent[1]),confirmedReceipt);
      assert.equal(confirmedReceipt.relationshipSessionId,oldIdentity.relationship_session_id);
      assert.ok((await rows('action_feedback_outbox',`relationship_id=eq.${pair}&select=recipient_participant_id`,sub.token)).every(x=>x.recipient_participant_id===oldIdentity.participant_id));
      assert.deepEqual(confirmedReceipt,ok(await rpc(sub,'get_my_action_receipt',{p_command_id:confirmedPayload.p_command_id,p_expected_relationship_id:pair})));
      ok(await taskCommand(sub,oldIdentity,domTask.id));
      const buy=ok(await rewardCommand(sub,oldIdentity,reward.id,'reward_buy',{p_expected_cost:20}));
      ok(await rewardCommand(dom,oldDomIdentity,reward.id,'reward_gift'));
      const used=ok(await rewardCommand(sub,oldIdentity,reward.id,'reward_redeem',{p_inventory_currency:'sub'}));
      ok(await undo(dom,oldDomIdentity,used.eventIds[0]));
      assert.equal(await balance(pair,'sub'),80);assert.equal(await balance(pair,'dom'),80);
      const punished=ok(await rpc(sub,'execute_recording_command',await forwardBody(sub,oldIdentity,'punishment_apply',punishment.id)));
      ok(await undo(dom,oldDomIdentity,punished.eventIds[0]));
      const broken=ok(await rpc(dom,'execute_recording_command',await forwardBody(dom,oldDomIdentity,'rule_violation',rule.id)));
      ok(await undo(sub,oldIdentity,broken.eventIds[0]));
      assert.equal(await balance(pair,'sub'),80);assert.equal(await balance(pair,'dom'),80);
      assert.equal((await rows('reward_inventory_lots',`relationship_id=eq.${pair}&status=eq.available&select=id`)).length,2);
      assert.equal(buy.refunds.length,0);
      for(const table of ['tasks','rewards','rules','punishments','messages','archived_messages','wellbeing_snapshots',
        'task_completion_history','reward_usage','rule_violations','punishment_history']) {
        denied(await req('DELETE',`/rest/v1/${table}?id=eq.${randomUUID()}`,sub.token),'STALE_RELATIONSHIP_SESSION');
      }
      denied(await req('PATCH',`/rest/v1/tasks?id=eq.${task.id}`,sub.token,{title:'Stale edit'},randomUUID()),'STALE_RELATIONSHIP_SESSION');
      ok(await req('PATCH',`/rest/v1/tasks?id=eq.${task.id}`,sub.token,{title:'Reviewed edit'},oldIdentity.relationship_session_id));
      denied(await rpc(other,'execute_task_command',{...confirmedPayload,p_command_id:randomUUID()}),'STALE_RELATIONSHIP');
      denied(await rpc(null,'execute_task_command',confirmedPayload));
      denied(await rpc(sub,'_execute_task_before_session',{p_command_id:randomUUID(),p_expected_relationship_id:pair,p_action:'task_complete',p_task_id:task.id}));
      denied(await req('PATCH',`/rest/v1/relationship_periods?id=eq.${pair}`,sub.token,{relationship_session_id:randomUUID()}));
      unconfirmedPayload={...confirmedPayload,p_command_id:randomUUID()};
      oldWallets=await wallets(pair);oldMembers=await rows('relationship_period_members',`relationship_id=eq.${pair}&select=participant_id,user_id,role`);
      oldActivation=(await rows('action_accounting_periods',`relationship_id=eq.${pair}&select=activation_id,source_snapshot`))[0];
      oldLedger=await ledger(pair);
    });

    await t.test('omitted session arguments and private implementation RPCs cannot bypass enforcement',async()=>{
      const periodOnly={p_expected_relationship_id:pair};
      const calls=[
        ['execute_reward_command',{...periodOnly,p_command_id:randomUUID(),p_action:'reward_buy',p_reward_id:reward.id,p_expected_cost:20}],
        ['execute_task_command',{...periodOnly,p_command_id:randomUUID(),p_action:'task_complete',p_task_id:task.id}],
        ['execute_recording_command',{...periodOnly,p_command_id:randomUUID(),p_action:'rule_violation',p_rule_id:rule.id}],
        ['undo_action',{...periodOnly,p_command_id:randomUUID(),p_event_id:confirmedReceipt.eventIds[0]}],
        ['set_relationship_permissions',{...periodOnly,p_permissions:{task_complete:'both'}}],
        ['acknowledge_action_feedback',{...periodOnly,p_event_id:confirmedReceipt.eventIds[0],p_kind:'action_confirmed'}],
        ['unlink_my_partner',periodOnly],
        ['generate_partner_link_code',{...periodOnly,p_mode:'fresh'}],
        ['accept_partner_link_code',{...periodOnly,p_code:'0'.repeat(32),p_mode:'fresh'}],
      ];
      const before=await globalDigest();
      for(const [name,payload] of calls)denied(await rpc(dom,name,payload),'STALE_RELATIONSHIP_SESSION');
      denied(await rpc(sub,'_identity_unlink_without_accounting',periodOnly));
      denied(await rpc(sub,'_identity_generate_code_without_session',{...periodOnly,p_mode:'fresh'}));
      denied(await rpc(sub,'_identity_project_current_wallet',{p_user:sub.id}));
      for(const table of ['identity_contexts','relationship_periods','relationship_period_members','partner_link_invitations'])
        denied(await req('GET',`/rest/v1/${table}?select=*`,sub.token));
      assert.deepEqual(await globalDigest(),before);
    });

    await t.test('Unlink retains each correct balance in initialized solo wallets without moving old rows',async()=>{
      await unlink(dom);const d=await identity(dom),s=await identity(sub);
      assert.equal(d.status,'ready_solo');assert.equal(s.status,'ready_solo');assert.notEqual(d.relationship_id,s.relationship_id);
      assert.equal(await balance(d.relationship_id,'dom'),80);assert.equal(await balance(s.relationship_id,'sub'),80);
      assert.equal((await wallets(d.relationship_id)).length,1);assert.equal((await wallets(s.relationship_id)).length,1);
      assert.deepEqual(await ledger(pair),oldLedger);
      assert.equal((await rows('action_events',`relationship_id=eq.${pair}&select=id`,sub.token)).length,0);
      assert.equal((await rows('reward_inventory_lots',`relationship_id=eq.${pair}&select=id`,sub.token)).length,0);
      assert.equal((await rows('profiles',`id=eq.${dom.id}&select=id`,sub.token)).length,0);
      assert.equal((await rows('rewards',`relationship_id=eq.${s.relationship_id}&select=id`)).length,0);
      const before=await globalDigest();await unlink(sub);assert.deepEqual(await globalDigest(),before,'Repeated solo unlink must not reset or duplicate openings');
    });

    await t.test('Continue requires exact same pair and consent; restores archived wallet and inventory only once',async()=>{
      const soloTask=await insert(sub,'tasks',{title:'Solo progress',points:3,frequency:'daily',frequency_count:5,is_dom_task:false});
      ok(await taskCommand(sub,await identity(sub),soloTask.id));assert.equal(await balance((await identity(sub)).relationship_id,'sub'),83);
      const invite=await generate(dom,'continue',pair),before=await globalDigest();
      denied(await acceptRaw(sub,invite,{p_mode:'fresh',p_previous_relationship_id:null}),'CONSENT_MISMATCH');
      denied(await acceptRaw(other,invite),'INVALID_LINK_CODE');
      assert.deepEqual(await globalDigest(),before);
      ok(await req('PATCH',`/rest/v1/action_accounting_periods?relationship_id=eq.${pair}`,service,{accounting_enabled:false}));
      const disabledBefore=await globalDigest();
      denied(await acceptRaw(sub,invite),'LIFECYCLE_ACCOUNTING_INTEGRATION_REQUIRED');
      assert.deepEqual(await globalDigest(),disabledBefore,'Failed transition must roll back source archives/context changes');
      ok(await req('PATCH',`/rest/v1/action_accounting_periods?relationship_id=eq.${pair}`,service,{accounting_enabled:true}));
      const result=await accept(sub,invite);
      assert.equal(result.relationship_id,pair);assert.equal(result.participant_id,oldIdentity.participant_id);
      assert.notEqual(result.relationship_session_id,oldIdentity.relationship_session_id);
      assert.deepEqual(await wallets(pair),oldWallets);
      assert.deepEqual(await rows('relationship_period_members',`relationship_id=eq.${pair}&select=participant_id,user_id,role`),oldMembers);
      assert.deepEqual((await rows('action_accounting_periods',`relationship_id=eq.${pair}&select=activation_id,source_snapshot`))[0],oldActivation);
      assert.deepEqual(await ledger(pair),oldLedger);
      assert.equal((await rows('profiles',`id=eq.${sub.id}&select=points`))[0].points,80);
    });

    await t.test('old same-period intentions cannot execute after Continue; exact owned receipt recovery is read-only',async()=>{
      const current=await identity(sub),currentDom=await identity(dom),before=await globalDigest();
      denied(await rpc(sub,'execute_task_command',unconfirmedPayload),'STALE_RELATIONSHIP_SESSION');
      denied(await rpc(sub,'execute_task_command',confirmedPayload),'STALE_RELATIONSHIP_SESSION');
      denied(await rewardCommand(sub,oldIdentity,reward.id,'reward_buy',{p_expected_cost:20}),'STALE_RELATIONSHIP_SESSION');
      denied(await rpc(sub,'execute_recording_command',{...scope(oldIdentity),p_command_id:randomUUID(),p_action:'rule_violation',p_rule_id:rule.id}),'STALE_RELATIONSHIP_SESSION');
      denied(await undo(sub,oldIdentity,confirmedReceipt.eventIds[0]),'STALE_RELATIONSHIP_SESSION');
      denied(await rpc(dom,'set_relationship_permissions',{...scope(oldDomIdentity),p_permissions:{task_complete:'dom'}}),'STALE_RELATIONSHIP_SESSION');
      denied(await rpc(sub,'acknowledge_action_feedback',{...scope(oldIdentity),p_event_id:confirmedReceipt.eventIds[0],p_kind:'action_confirmed'}),'STALE_RELATIONSHIP_SESSION');
      denied(await rpc(sub,'unlink_my_partner',scope(oldIdentity)),'STALE_RELATIONSHIP_SESSION');
      denied(await rpc(sub,'generate_partner_link_code',{...scope(oldIdentity),p_mode:'fresh'}),'STALE_RELATIONSHIP_SESSION');
      denied(await rpc(sub,'accept_partner_link_code',{...scope(oldIdentity),p_code:'0'.repeat(32),p_mode:'fresh'}),'STALE_RELATIONSHIP_SESSION');
      denied(await req('PATCH',`/rest/v1/tasks?id=eq.${task.id}`,sub.token,{title:'Old tab'},oldIdentity.relationship_session_id),'STALE_RELATIONSHIP_SESSION');
      const recover={p_command_id:confirmedPayload.p_command_id,p_expected_relationship_id:pair};
      assert.deepEqual(ok(await rpc(sub,'get_my_action_receipt',recover)),confirmedReceipt);
      assert.equal(ok(await rpc(dom,'get_my_action_receipt',recover)),null);assert.equal(ok(await rpc(other,'get_my_action_receipt',recover)),null);
      assert.equal(ok(await rpc(sub,'get_my_action_receipt',{...recover,p_command_id:unconfirmedPayload.p_command_id})),null);
      denied(await rpc(null,'get_my_action_receipt',recover));
      assert.deepEqual(await globalDigest(),before);
      // A new, reviewed generation can request the same already-confirmed command:
      // it replays the ORIGINAL receipt and generation, never a second award.
      assert.deepEqual(ok(await rpc(sub,'execute_task_command',{...confirmedPayload,...scope(current)})),confirmedReceipt);
      assert.deepEqual(await globalDigest(),before);
      ok(await rpc(dom,'set_relationship_permissions',{...scope(currentDom),p_permissions:{task_complete:'both'}}));
      ok(await rpc(sub,'acknowledge_action_feedback',{...scope(current),p_event_id:confirmedReceipt.eventIds[0],p_kind:'action_confirmed'}));
      assert.equal((await rows('action_feedback_acknowledgments',`event_id=eq.${confirmedReceipt.eventIds[0]}&select=event_id`,sub.token)).length,1);
      assert.equal((await rows('action_feedback_acknowledgments',`event_id=eq.${confirmedReceipt.eventIds[0]}&select=event_id`,dom.token)).length,0);
      assert.equal((await rows('action_events',`command_id=eq.${unconfirmedPayload.p_command_id}&select=id`)).length,0);
    });

    await t.test('a second Continue preserves the ledger and frozen activation; concurrent claim is consumed once',async()=>{
      const next=ok(await taskCommand(sub,await identity(sub),task.id));assert.equal(next.relationshipSessionId,(await identity(sub)).relationship_session_id);
      const before=await ledger(pair),session=(await identity(sub)).relationship_session_id;
      await unlink(dom);const inv=await generate(dom,'continue',pair),s=await identity(sub);
      const request={...scope(s),p_code:inv.code,p_mode:'continue',p_previous_relationship_id:pair};
      const results=await Promise.all([rpc(sub,'accept_partner_link_code',request),rpc(sub,'accept_partner_link_code',request)]);
      assert.equal(results.filter(x=>x.status<300).length,1);denied(results.find(x=>x.status>=400),'STALE_RELATIONSHIP');
      assert.notEqual((await identity(sub)).relationship_session_id,session);
      assert.deepEqual(await ledger(pair),before);
      assert.equal((await rows('action_accounting_periods',`relationship_id=eq.${pair}&select=activation_id`))[0].activation_id,oldActivation.activation_id);
      assert.equal((await rows('reward_inventory_lots',`relationship_id=eq.${pair}&select=id`)).length,2);
    });

    await t.test('same-pair Fresh and different-partner Fresh create separate zero state without former data',async()=>{
      await unlink(sub);const previous=pair;const before=await ledger(previous);
      let result=await link(dom,sub);assert.notEqual(result.relationship_id,previous);
      const fresh=result.relationship_id;assert.equal(await balance(fresh,'sub'),0);assert.equal(await balance(fresh,'dom'),0);
      assert.equal((await rows('reward_inventory_lots',`relationship_id=eq.${fresh}&select=id`)).length,0);
      assert.equal((await rows('tasks',`relationship_id=eq.${fresh}&select=id`)).length,0);
      assert.deepEqual(await ledger(previous),before);
      await unlink(dom);result=await link(dom,other);assert.notEqual(result.relationship_id,fresh);
      assert.equal(await balance(result.relationship_id,'dom'),0);assert.equal(await balance(result.relationship_id,'sub'),0);
      assert.equal((await rows('action_events',`relationship_id=eq.${previous}&select=id`,other.token)).length,0);
      // This explicit missing-target probe retains the original reviewed context;
      // it must not fetch or infer assumptions for an inaccessible old task.
      denied(await rpc(other,'execute_task_command',{...confirmedPayload,...scope(await identity(other)),p_command_id:randomUUID()}),'TASK_NOT_FOUND');
      assert.deepEqual(await ledger(previous),before);
    });

    await t.test('malformed unlink repairs only its own context; unrelated pair and ledger survive',async()=>{
      intruder=await createAccount('sub',9);await activate(intruder);await ready(intruder);
      const d=await identity(dom),o=await identity(other),before=await ledger(d.relationship_id);
      ok(await req('PATCH',`/rest/v1/profiles?id=eq.${intruder.id}`,service,{linked_partner_id:dom.id}));
      const bad=await identity(intruder);assert.equal(bad.status,'incomplete_partner');assert.ok(bad.relationship_session_id);
      const repaired=await unlink(intruder);assert.equal(repaired.status,'ready_solo');assert.equal(await balance(repaired.relationship_id,'sub'),9);
      assert.equal((await identity(dom)).relationship_id,d.relationship_id);assert.equal((await identity(other)).relationship_id,o.relationship_id);
      assert.equal((await identity(dom)).status,'ready_linked');assert.deepEqual(await ledger(d.relationship_id),before);
    });

    await t.test('racing completion and unlink serialize: accepted award is carried, otherwise no award occurs',async()=>{
      const i=await identity(other),raceTask=await insert(other,'tasks',{title:'Race task',points:7,frequency:'daily',frequency_count:1,is_dom_task:false});
      const payload=await forwardBody(other,i,'task_complete',raceTask.id);
      const results=await Promise.all([rpc(other,'execute_task_command',payload),rpc(dom,'unlink_my_partner',scope(await identity(dom)))]);
      ok(results[1]);await Promise.all(accounts.map(identity));const s=await identity(other);
      if(results[0].status<300)assert.equal(await balance(s.relationship_id,'sub'),7);
      else{denied(results[0],'STALE_RELATIONSHIP');assert.equal(await balance(s.relationship_id,'sub'),0);}
      assert.equal((await rows('action_events',`command_id=eq.${payload.p_command_id}&select=id`)).length,results[0].status<300?1:0);
      const receipt=ok(await rpc(other,'get_my_action_receipt',{p_command_id:payload.p_command_id,p_expected_relationship_id:i.relationship_id}));
      assert.equal(receipt!==null,results[0].status<300);
    });
  } finally {
    trace('cleanup-start');
    const ids=accounts.map(a=>a.id);
    if(ids.length)for(const m of await rows('relationship_period_members',`user_id=in.(${ids.join(',')})&select=relationship_id`))periods.add(m.relationship_id);
    for(const p of periods)for(const table of ['action_feedback_acknowledgments','action_feedback_outbox','action_command_receipts',
      'reward_usage','task_completion_history','rule_violations','punishment_history','action_inventory_movements','action_point_entries',
      'reward_inventory_lots','action_events','action_task_openings','action_wallets','action_accounting_periods','rewards','tasks','rules','punishments']) {
      ok(await req('DELETE',`/rest/v1/${table}?relationship_id=eq.${p}`,service));
    }
    for(const a of accounts)ok(await req('PATCH',`/rest/v1/profiles?id=eq.${a.id}`,service,{linked_partner_id:null}));
    for(const a of accounts)ok(await req('DELETE',`/auth/v1/admin/users/${a.id}`,service));
    for(const p of periods){ok(await req('DELETE',`/rest/v1/relationship_period_members?relationship_id=eq.${p}`,service));ok(await req('DELETE',`/rest/v1/relationship_periods?id=eq.${p}`,service));}
    for(const table of tables)assert.equal(hash(await allRows(table)),originals.get(table),`Original ${table} changed`);
    assert.deepEqual(await authIds(),originalAuth,'Original Auth accounts changed');
    trace('cleanup-verified',{protectedTables:tables.length,originalAuthIdsUnchanged:true});
  }
});
