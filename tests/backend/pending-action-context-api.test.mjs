/** Reviewed LOCAL0800 only. No SQL application, remote targets or original activation.
 * Synthetic aged contexts test rejection, not clock travel or retrospective writes.
 * Run exclusively after parent review/apply, with the pinned status file explicitly set.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID, randomBytes, createHash } from 'node:crypto';

const statusFile=process.env.OBEDIENCE_LOCAL_STATUS_FILE;
test('pending task and recording assumptions remain explicit and immutable',{
  skip:statusFile?false:'Requires reviewed0800 and explicit local runtime; no API requests made.',timeout:180_000,
},async(t)=>{
  assert.ok(statusFile.startsWith('/'));
  const status=JSON.parse(await readFile(statusFile,'utf8'));
  assert.equal(status.runtime,'native');assert.equal(status.env.API_URL,'http://127.0.0.1:28622');
  assert.equal(new URL(status.env.DB_URL).hostname,'127.0.0.1');assert.equal(new URL(status.env.DB_URL).port,'20324');
  const api=status.env.API_URL,anon=status.env.ANON_KEY,service=status.env.SERVICE_ROLE_KEY;
  assert.ok(anon&&service);
  const accounts=[],periods=new Set(),originals=new Map();
  const tables=['admin_document_readers','app_guide_content','archived_messages','encyclopedia_entries','messages','profiles',
    'punishment_history','punishments','reward_usage','rewards','rule_violations','rules','task_completion_history','tasks',
    'user_color_schemes','user_notification_preferences','user_push_subscriptions','user_roles','wellbeing_snapshots','wellness_reminders',
    'identity_contexts','relationship_periods','relationship_period_members','partner_link_invitations','action_accounting_periods',
    'action_events','action_wallets','action_point_entries','reward_inventory_lots','action_inventory_movements','action_command_receipts',
    'action_feedback_outbox','action_feedback_acknowledgments','action_task_openings','runtime_probe'];
  const periodTables=['rules','tasks','rewards','punishments','rule_violations','task_completion_history','reward_usage','punishment_history',
    'action_accounting_periods','action_events','action_wallets','action_point_entries','reward_inventory_lots','action_inventory_movements',
    'action_command_receipts','action_feedback_outbox','action_feedback_acknowledgments','action_task_openings'];
  const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'
    ?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
  const hash=x=>createHash('sha256').update(JSON.stringify(x.map(canonical).map(JSON.stringify).sort())).digest('hex');
  async function req(method,path,token=service,body,session){
    assert.match(path,/^\/(auth|rest)\/v1\//);const url=new URL(path,api);assert.equal(url.origin,api);
    const controller=new AbortController();let timer;
    const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Pinned local request exceeded12000ms'));},12_000);});
    try{return await Promise.race([deadline,(async()=>{
      const r=await fetch(url,{method,headers:{apikey:token===service?service:anon,Authorization:`Bearer ${token}`,
        'Content-Type':'application/json',Prefer:'return=representation',...(session?{'x-relationship-session-id':session}:{})},
        body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,redirect:'error'});
      const text=await r.text();let data;try{data=text?JSON.parse(text):null;}catch{data=null;}return{status:r.status,data};
    })()]);}finally{clearTimeout(timer);}
  }
  const ok=r=>{assert.ok(r.status>=200&&r.status<300,`HTTP${r.status}: ${r.data?.code??'none'} / ${r.data?.message??'none'}`);return r.data;};
  const denied=(r,message)=>{assert.ok(r.status>=400,`Expected denial, received${r.status}`);if(message)assert.equal(r.data?.message,message);};
  const rows=async(table,query='select=*',token=service)=>ok(await req('GET',`/rest/v1/${table}?${query}`,token));
  async function allRows(table){const result=[];for(let offset=0;;offset+=500){const page=await rows(table,`select=*&limit=500&offset=${offset}`);result.push(...page);if(page.length<500)return result;}}
  async function authIds(){const ids=[];for(let page=1;;page++){const users=ok(await req('GET',`/auth/v1/admin/users?page=${page}&per_page=100`)).users;ids.push(...users.map(u=>u.id));if(users.length<100)return ids.sort();}}
  const rpc=(a,name,body={})=>req('POST',`/rest/v1/rpc/${name}`,a?.token??anon,body);
  async function identity(a){const i=ok(await rpc(a,'get_my_identity'));if(i.relationship_id)periods.add(i.relationship_id);return i;}
  const scope=i=>({p_expected_relationship_id:i.relationship_id,p_expected_relationship_session_id:i.relationship_session_id});
  async function account(role){
    const email=`context-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('base64url');
    const u=ok(await req('POST','/auth/v1/admin/users',service,{email,password,email_confirm:true,user_metadata:{role}}));
    const a={id:u.id,token:null};accounts.push(a);
    a.token=ok(await req('POST','/auth/v1/token?grant_type=password',anon,{email,password})).access_token;
    await identity(a);ok(await rpc(a,'set_my_timezone',{p_timezone:'UTC'}));return a;
  }
  async function activateSolo(a){
    const i=await identity(a);assert.equal(i.status,'ready_solo');assert.equal(i.lifecycle_ready,false);
    ok(await req('POST','/rest/v1/rpc/activate_action_accounting',service,{p_relationship_id:i.relationship_id}));
    ok(await req('PATCH',`/rest/v1/identity_contexts?user_id=eq.${a.id}`,service,{lifecycle_ready:true}));
  }
  async function insert(a,table,body){const i=await identity(a);return ok(await req('POST',`/rest/v1/${table}`,a.token,
    {user_id:a.id,relationship_id:i.relationship_id,...body},i.relationship_session_id))[0];}
  async function patch(a,table,id,body){const i=await identity(a);return ok(await req('PATCH',`/rest/v1/${table}?id=eq.${id}`,a.token,body,i.relationship_session_id));}
  async function context(a,type,id){const i=await identity(a);const r=ok(await rpc(a,type==='task'?'get_task_progress':'get_recording_progress',
    {p_expected_relationship_id:i.relationship_id,...(type==='task'?{p_task_id:id}:{p_subject_type:type,p_subject_id:id})}));
    assert.ok(r.expectedContext);return structuredClone(r.expectedContext);}
  const payload=(i,kind,id,expected)=>({...scope(i),p_command_id:randomUUID(),p_action:kind,
    ...(kind==='task_complete'?{p_task_id:id}:kind==='rule_violation'?{p_rule_id:id}:{p_punishment_id:id}),p_expected_context:structuredClone(expected)});
  const execute=(a,p)=>rpc(a,p.p_action==='task_complete'?'execute_task_command':'execute_recording_command',p);
  async function complete(a,id){return ok(await execute(a,payload(await identity(a),'task_complete',id,await context(a,'task',id))));}
  const undo=async(a,id)=>ok(await rpc(a,'undo_action',{...scope(await identity(a)),p_command_id:randomUUID(),p_event_id:id}));
  const recover=(a,p)=>rpc(a,'get_my_action_receipt',{p_command_id:p.p_command_id,p_expected_relationship_id:p.p_expected_relationship_id});
  async function digest(period){const result={};for(const table of periodTables)result[table]=hash(await rows(table,`relationship_id=eq.${period}&select=*`));
    result.profiles=hash(await rows('profiles',`id=in.(${accounts.map(a=>a.id).join(',')})&select=*`));return result;}
  async function noEffect(period,run,error){const before=await digest(period);denied(await run(),error);assert.deepEqual(await digest(period),before);}
  function shifted(calendar,days){const date=new Date(`${calendar.localDate}T00:00:00Z`);date.setUTCDate(date.getUTCDate()+days);
    const monday=new Date(date);monday.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7);
    return{...calendar,localDate:date.toISOString().slice(0,10),weekStartDate:monday.toISOString().slice(0,10)};}
  function localDate(timestamp,timeZone){const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(timestamp));
    const field=name=>parts.find(p=>p.type===name).value;return`${field('year')}-${field('month')}-${field('day')}`;}
  async function event(receipt){return(await rows('action_events',`id=eq.${receipt.eventIds[0]}&select=*`))[0];}
  async function balance(period,currency){return(await rows('action_wallets',`relationship_id=eq.${period}&currency=eq.${currency}&select=balance`))[0].balance;}
  // Anonymous requests cannot execute either command, but exact signature
  // resolution must produce permission denial, not a missing0800 overload.
  // Service OpenAPI intentionally omits these authenticated-only functions.
  for(const[name,action]of[['execute_task_command','task_complete'],['execute_recording_command','rule_violation']]){
    const probe=await rpc(null,name,{p_command_id:randomUUID(),p_expected_relationship_id:randomUUID(),
      p_expected_relationship_session_id:randomUUID(),p_action:action,p_expected_context:{}});
    assert.ok([401,403].includes(probe.status),'Apply reviewed0800 before fixtures');assert.equal(probe.data?.code,'42501');
  }
  const originalAuth=await authIds();for(const table of tables)originals.set(table,hash(await allRows(table)));
  const originalPeriods=new Set((await rows('relationship_periods','select=id')).map(x=>x.id));
  assert.equal((await rows('identity_contexts','select=lifecycle_ready')).some(x=>x.lifecycle_ready),false);
  assert.equal((await rows('action_accounting_periods','select=accounting_enabled')).some(x=>x.accounting_enabled),false);
  let dom,sub,stranger,solo,pair,d,s,task,rule,punishment;
  try{
    dom=await account('dom');sub=await account('sub');stranger=await account('sub');solo=await account('sub');
    await activateSolo(dom);await activateSolo(sub);await activateSolo(solo);
    const invitation=ok(await rpc(dom,'generate_partner_link_code',{...scope(await identity(dom)),p_mode:'fresh'}));
    pair=ok(await rpc(sub,'accept_partner_link_code',{...scope(await identity(sub)),p_mode:'fresh',p_code:invitation.code})).relationship_id;
    periods.add(pair);d=await identity(dom);s=await identity(sub);
    task=await insert(sub,'tasks',{title:'Context task',points:5,frequency:'weekly',frequency_count:100,is_dom_task:false});
    rule=await insert(sub,'rules',{title:'Context rule'});
    punishment=await insert(sub,'punishments',{title:'Context punishment',points:30,dom_points:4});
    const funds=await insert(sub,'tasks',{title:'Synthetic opening earnings',points:60,frequency:'daily',frequency_count:1,is_dom_task:false});await complete(sub,funds.id);

    await t.test('progress contexts are strict role-based values and private helpers cannot bypass them',async()=>{
      const c=await context(sub,'task',task.id);assert.deepEqual(Object.keys(c).sort(),['beneficiaryParticipantId','currency','deadline','dueAt','frequency','kind','localDate','mandatory','points','subjectId','target','timeZone','version','weekStartDate'].sort());
      assert.equal(c.version,2);assert.equal(c.mandatory,false);assert.deepEqual(c.deadline,{date:null,time:null,weekday:null});assert.equal(c.dueAt,null);assert.equal(c.beneficiaryParticipantId,s.participant_id);assert.equal(c.currency,'sub');assert.equal(c.points,5);assert.equal(c.target,100);
      const r=await context(dom,'rule',rule.id),p=await context(sub,'punishment',punishment.id);
      assert.deepEqual(Object.keys(r).sort(),['kind','sub','subjectId','version']);assert.equal(r.sub.participantId,s.participant_id);
      assert.equal(p.sub.participantId,s.participant_id);assert.equal(p.dom.participantId,d.participant_id);assert.equal(p.subDeduction,30);assert.equal(p.domAward,4);
      for(const value of[c,r,p]){assert.ok(!JSON.stringify(value).includes(dom.id));assert.ok(!JSON.stringify(value).includes(sub.id));assert.ok(!JSON.stringify(value).includes('title'));}
      for(const name of['_execute_task_before_session','_execute_task_with_context','_execute_recording_before_session','_execute_recording_with_context'])denied(await rpc(sub,name,{}));
      const pld=payload(s,'task_complete',task.id,c);denied(await execute(null,pld));denied(await execute(stranger,pld),'STALE_RELATIONSHIP');
      denied(await execute(sub,{...pld,p_expected_relationship_session_id:randomUUID()}),'STALE_RELATIONSHIP_SESSION');
    });

    await t.test('missing and malformed contexts reject without writes; old pending IDs remain receipt-read only',async()=>{
      for(const[kind,type,id]of[['task_complete','task',task.id],['rule_violation','rule',rule.id],['punishment_apply','punishment',punishment.id]]){
        const p=payload(s,kind,id,await context(sub,type,id));delete p.p_expected_context;
        await noEffect(pair,()=>execute(sub,p),'ACTION_CONTEXT_REQUIRED');assert.equal(ok(await recover(sub,p)),null);
        await noEffect(pair,()=>execute(sub,{...p,p_expected_context:null}),'ACTION_CONTEXT_REQUIRED');
        for(const invalid of[{},[],{...await context(sub,type,id),extra:true},{...await context(sub,type,id),subjectId:randomUUID()}])
          await noEffect(pair,()=>execute(sub,{...p,p_expected_context:invalid}),'ACTION_CONTEXT_INVALID');
      }
    });

    await t.test('task beneficiary, configured points, frequency and target changes require a new review',async()=>{
      const p=payload(s,'task_complete',task.id,await context(sub,'task',task.id));
      for(const[change,error]of[[{is_dom_task:true,points:9},'ACTION_BENEFICIARY_CHANGED'],[{points:9},'ACTION_DEFINITION_CHANGED'],
        [{frequency:'daily'},'ACTION_DEFINITION_CHANGED'],[{frequency_count:101},'ACTION_DEFINITION_CHANGED']]){
        await patch(dom,'tasks',task.id,change);await noEffect(pair,()=>execute(sub,p),error);
        await patch(dom,'tasks',task.id,{is_dom_task:false,points:5,frequency:'weekly',frequency_count:100});
      }
      await patch(dom,'tasks',task.id,{is_dom_task:true});const fresh=payload(s,'task_complete',task.id,await context(sub,'task',task.id));
      const receipt=ok(await execute(sub,fresh));assert.equal(receipt.pointDeltas[0].participantId,d.participant_id);assert.equal(receipt.pointDeltas[0].currency,'dom');
      await undo(dom,receipt.eventIds[0]);await patch(dom,'tasks',task.id,{is_dom_task:false});
    });

    await t.test('weekly actions cannot move weekdays; saved timezone and Monday week are checked separately',async()=>{
      const p=payload(s,'task_complete',task.id,await context(sub,'task',task.id));
      const weekday=(new Date(`${p.p_expected_context.localDate}T00:00:00Z`).getUTCDay()+6)%7;
      const changedDay=shifted(p.p_expected_context,weekday===0?1:-1);assert.equal(changedDay.weekStartDate,p.p_expected_context.weekStartDate);
      await noEffect(pair,()=>execute(sub,{...p,p_expected_context:changedDay}),'ACTION_DATE_CHANGED');
      await noEffect(pair,()=>execute(sub,{...p,p_expected_context:shifted(p.p_expected_context,-7)}),'ACTION_DATE_CHANGED');
      ok(await rpc(sub,'set_my_timezone',{p_timezone:'Pacific/Kiritimati'}));
      await noEffect(pair,()=>execute(sub,p),'ACTION_TIMEZONE_CHANGED');
      await patch(dom,'tasks',task.id,{points:6});await noEffect(pair,()=>execute(sub,p),'ACTION_DEFINITION_CHANGED');
      await patch(dom,'tasks',task.id,{points:5});ok(await rpc(sub,'set_my_timezone',{p_timezone:'UTC'}));
    });

    await t.test('confirmed task receipt replays before new assumptions, altered same-ID context fails and Undo uses originals',async()=>{
      ok(await rpc(sub,'set_my_timezone',{p_timezone:'Pacific/Pago_Pago'}));
      const p=payload(s,'task_complete',task.id,await context(sub,'task',task.id)),receipt=ok(await execute(sub,p)),original=await event(receipt);
      assert.equal(original.recorded_at,(await rows('task_completion_history',`action_event_id=eq.${original.id}&select=completed_at`))[0].completed_at);
      assert.equal(original.calendar.localDate,localDate(original.recorded_at,p.p_expected_context.timeZone));assert.equal(original.definition_values.points,5);
      assert.deepEqual(original.intent.expectedContext,p.p_expected_context);
      ok(await rpc(sub,'set_my_timezone',{p_timezone:'Pacific/Kiritimati'}));
      assert.notEqual((await context(sub,'task',task.id)).localDate,p.p_expected_context.localDate);
      await patch(dom,'tasks',task.id,{points:17,is_dom_task:true,frequency:'daily',frequency_count:1});
      const before=await digest(pair);assert.deepEqual(ok(await execute(sub,p)),receipt);assert.deepEqual(await digest(pair),before);
      await noEffect(pair,()=>execute(sub,{...p,p_expected_context:{...p.p_expected_context,points:17}}),'COMMAND_ID_REUSED');
      assert.deepEqual(ok(await recover(sub,p)),receipt);assert.equal(ok(await recover(dom,p)),null);
      const without={...p};delete without.p_expected_context;await noEffect(pair,()=>execute(sub,without),'ACTION_CONTEXT_REQUIRED');
      const reversal=await undo(dom,original.id),reversed=await event(reversal);
      assert.equal(reversal.pointDeltas[0].amount,-5);assert.equal(reversal.pointDeltas[0].participantId,s.participant_id);assert.deepEqual(reversed.calendar,original.calendar);
      await patch(dom,'tasks',task.id,{points:5,is_dom_task:false,frequency:'weekly',frequency_count:100});ok(await rpc(sub,'set_my_timezone',{p_timezone:'UTC'}));
    });

    await t.test('rule recording has no point effect and freezes only its real Sub calendar',async()=>{
      const c=await context(sub,'rule',rule.id),p=payload(s,'rule_violation',rule.id,c),beforeBalances=await rows('action_wallets',`relationship_id=eq.${pair}&select=*`);
      await noEffect(pair,()=>execute(sub,{...p,p_expected_context:{...c,sub:shifted(c.sub,-1)}}),'ACTION_DATE_CHANGED');
      ok(await rpc(dom,'set_my_timezone',{p_timezone:'Pacific/Kiritimati'}));
      const receipt=ok(await execute(dom,p));assert.deepEqual(receipt.pointDeltas,[]);assert.equal(hash(await rows('action_wallets',`relationship_id=eq.${pair}&select=*`)),hash(beforeBalances));
      const original=await event(receipt);assert.equal(original.calendar.participantId,s.participant_id);assert.equal(original.calendar.timeZone,'UTC');
      ok(await rpc(sub,'set_my_timezone',{p_timezone:'Pacific/Pago_Pago'}));
      await noEffect(pair,()=>execute(dom,{...p,p_command_id:randomUUID()}),'ACTION_TIMEZONE_CHANGED');
      assert.deepEqual(ok(await execute(dom,p)),receipt);
      await noEffect(pair,()=>execute(dom,{...p,p_expected_context:{...c,sub:{...c.sub,timeZone:'Pacific/Pago_Pago'}}}),'COMMAND_ID_REUSED');
      assert.deepEqual((await event(await undo(sub,original.id))).calendar,original.calendar);
      ok(await rpc(dom,'set_my_timezone',{p_timezone:'UTC'}));ok(await rpc(sub,'set_my_timezone',{p_timezone:'UTC'}));
    });

    await t.test('punishment freezes configured amounts and both applicable calendars, not available balance',async()=>{
      ok(await rpc(dom,'set_my_timezone',{p_timezone:'Pacific/Kiritimati'}));
      const c=await context(sub,'punishment',punishment.id),p=payload(s,'punishment_apply',punishment.id,c);
      assert.equal(c.sub.timeZone,'UTC');assert.equal(c.dom.timeZone,'Pacific/Kiritimati');
      for(const changes of[{points:31},{dom_points:5}]){await patch(dom,'punishments',punishment.id,changes);
        await noEffect(pair,()=>execute(sub,p),'ACTION_DEFINITION_CHANGED');await patch(dom,'punishments',punishment.id,{points:30,dom_points:4});}
      await patch(dom,'punishments',punishment.id,{dom_points:0});await noEffect(pair,()=>execute(sub,p),'ACTION_BENEFICIARY_CHANGED');
      await patch(dom,'punishments',punishment.id,{dom_points:4});
      await noEffect(pair,()=>execute(sub,{...p,p_expected_context:{...c,dom:shifted(c.dom,-1)}}),'ACTION_DATE_CHANGED');
      ok(await rpc(dom,'set_my_timezone',{p_timezone:'UTC'}));await noEffect(pair,()=>execute(sub,p),'ACTION_TIMEZONE_CHANGED');
      ok(await rpc(dom,'set_my_timezone',{p_timezone:'Pacific/Kiritimati'}));
      const spend=await insert(sub,'punishments',{title:'Intervening deduction',points:50,dom_points:0});
      ok(await execute(sub,payload(s,'punishment_apply',spend.id,await context(sub,'punishment',spend.id))));assert.equal(await balance(pair,'sub'),10);
      const receipt=ok(await execute(dom,p)),original=await event(receipt);
      assert.equal(receipt.pointDeltas.find(x=>x.currency==='sub').amount,-10);assert.equal(receipt.pointDeltas.find(x=>x.currency==='dom').amount,4);
      assert.equal(original.definition_values.subDeduction,30);assert.deepEqual(original.intent.expectedContext,c);
      const entries=await rows('action_point_entries',`event_id=eq.${original.id}&select=*`);
      for(const entry of entries){const calendar=entry.currency==='sub'?c.sub:c.dom;assert.equal(entry.calendar.localDate,localDate(original.recorded_at,calendar.timeZone));assert.deepEqual(entry.calendar,calendar);}
      await patch(dom,'punishments',punishment.id,{points:99,dom_points:13});ok(await rpc(dom,'set_my_timezone',{p_timezone:'UTC'}));
      assert.deepEqual(ok(await execute(dom,p)),receipt);
      await noEffect(pair,()=>execute(dom,{...p,p_expected_context:{...c,subDeduction:99}}),'COMMAND_ID_REUSED');
      const reversal=await undo(sub,original.id);assert.equal(reversal.pointDeltas.find(x=>x.currency==='sub').amount,10);assert.equal(reversal.pointDeltas.find(x=>x.currency==='dom').amount,-4);
      const reversedEntries=await rows('action_point_entries',`event_id=eq.${reversal.eventIds[0]}&select=*`);
      for(const entry of reversedEntries)assert.deepEqual(entry.calendar,entries.find(x=>x.currency===entry.currency).calendar);
      ok(await rpc(dom,'set_my_timezone',{p_timezone:'UTC'}));
    });

    await t.test('zero awards and absent Dom never invent a Dom clock or beneficiary',async()=>{
      const zero=await insert(sub,'punishments',{title:'Zero configured punishment',points:0,dom_points:0});
      const c=await context(sub,'punishment',zero.id);assert.equal(c.dom,null);assert.equal(c.subDeduction,0);assert.equal(c.domAward,0);
      ok(await rpc(dom,'set_my_timezone',{p_timezone:'Pacific/Kiritimati'}));
      const receipt=ok(await execute(sub,payload(s,'punishment_apply',zero.id,c)));assert.equal(receipt.pointDeltas.length,1);assert.equal(receipt.pointDeltas[0].amount,0);
      const soloId=await identity(solo),definition=await insert(solo,'punishments',{title:'Solo configured Dom award',points:0,dom_points:7});
      const soloContext=await context(solo,'punishment',definition.id);assert.equal(soloContext.dom,null);assert.equal(soloContext.domAward,7);
      const soloReceipt=ok(await execute(solo,payload(soloId,'punishment_apply',definition.id,soloContext)));assert.equal(soloReceipt.pointDeltas.length,1);
      assert.equal((await event(soloReceipt)).definition_values.domAwardOmittedReason,'dom_participant_absent');
      ok(await rpc(dom,'set_my_timezone',{p_timezone:'UTC'}));
    });

    await t.test('definition edits, timezone changes and duplicate execution serialize with checked values',async()=>{
      const raceTask=await insert(sub,'tasks',{title:'Concurrent reviewed task',points:2,frequency:'weekly',frequency_count:20,is_dom_task:false});
      const p=payload(s,'task_complete',raceTask.id,await context(sub,'task',raceTask.id));
      const results=await Promise.all([execute(sub,p),patch(dom,'tasks',raceTask.id,{points:9})]);
      if(results[0].status<300)assert.equal((await event(ok(results[0]))).definition_values.points,2);else denied(results[0],'ACTION_DEFINITION_CHANGED');
      await patch(dom,'tasks',raceTask.id,{points:2});
      const q=payload(s,'task_complete',raceTask.id,await context(sub,'task',raceTask.id));
      const timezone=await Promise.all([execute(sub,q),rpc(sub,'set_my_timezone',{p_timezone:'Pacific/Kiritimati'})]);ok(timezone[1]);
      if(timezone[0].status<300)assert.equal((await event(ok(timezone[0]))).calendar.timeZone,'UTC');else denied(timezone[0],'ACTION_TIMEZONE_CHANGED');
      ok(await rpc(sub,'set_my_timezone',{p_timezone:'UTC'}));
      const duplicate=payload(s,'task_complete',raceTask.id,await context(sub,'task',raceTask.id));
      const both=await Promise.all([execute(sub,duplicate),execute(sub,duplicate)]);assert.deepEqual(ok(both[0]),ok(both[1]));
      assert.equal((await rows('action_events',`command_id=eq.${duplicate.p_command_id}&select=id`)).length,1);
    });
  }finally{
    const ids=accounts.map(a=>a.id);
    assert.ok(ids.every(id=>!originalAuth.includes(id)),'Fixture overlaps an original Auth account');
    if(ids.length)for(const m of await rows('relationship_period_members',`user_id=in.(${ids.join(',')})&select=relationship_id`))periods.add(m.relationship_id);
    for(const period of periods){
      assert.ok(!originalPeriods.has(period));assert.ok((await rows('relationship_period_members',`relationship_id=eq.${period}&select=user_id`)).every(m=>m.user_id===null||ids.includes(m.user_id)));
      assert.ok((await rows('identity_contexts',`relationship_id=eq.${period}&select=user_id`)).every(c=>ids.includes(c.user_id)));
      assert.ok((await rows('notification_jobs',`relationship_id=eq.${period}&select=recipient_user_id`)).every(j=>ids.includes(j.recipient_user_id)));
      for(const table of['notification_jobs','action_feedback_acknowledgments','action_feedback_outbox','action_command_receipts','reward_usage','task_completion_history',
        'rule_violations','punishment_history','action_inventory_movements','action_point_entries','reward_inventory_lots','action_events','action_task_openings',
        'action_wallets','action_accounting_periods','rewards','tasks','rules','punishments'])ok(await req('DELETE',`/rest/v1/${table}?relationship_id=eq.${period}`,service));
    }
    for(const a of accounts){
      assert.ok((await rows('profiles',`linked_partner_id=eq.${a.id}&select=id`)).every(p=>ids.includes(p.id)));
      ok(await req('PATCH',`/rest/v1/profiles?id=eq.${a.id}`,service,{linked_partner_id:null}));
      ok(await req('DELETE',`/rest/v1/solo_role_change_receipts?actor_user_id=eq.${a.id}`,service));
      ok(await req('DELETE',`/rest/v1/identity_contexts?user_id=eq.${a.id}`,service));
    }
    // Keep the production Auth guard: remove only the proven synthetic graph first.
    for(const period of periods)ok(await req('DELETE',`/rest/v1/relationship_period_members?relationship_id=eq.${period}`,service));
    for(const a of accounts){
      ok(await req('DELETE',`/rest/v1/profiles?id=eq.${a.id}`,service));
      for(const [table,key]of[['profiles','id'],['identity_contexts','user_id'],['relationship_period_members','user_id'],['account_deletion_jobs','actor_user_id']]){
        assert.equal((await rows(table,`${key}=eq.${a.id}&select=*`)).length,0,`Fixture still referenced by ${table}`);
      }
      ok(await req('DELETE',`/auth/v1/admin/users/${a.id}`,service));
      assert.equal((await rows('user_notification_preferences',`user_id=eq.${a.id}&select=user_id`)).length,0);
      assert.equal((await rows('notification_jobs',`recipient_user_id=eq.${a.id}&select=id`)).length,0);
    }
    for(const period of periods){assert.equal((await rows('identity_contexts',`relationship_id=eq.${period}&select=user_id`)).length,0);ok(await req('DELETE',`/rest/v1/relationship_periods?id=eq.${period}`,service));}
    for(const table of tables)assert.equal(hash(await allRows(table)),originals.get(table),`Original${table} changed`);
    assert.deepEqual(await authIds(),originalAuth,'Original Auth accounts changed');
  }
});
