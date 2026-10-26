/** Local real API tests for the reviewed rule/punishment migration. Never applies SQL or activates original accounts.
 * Run after parent review/apply with OBEDIENCE_LOCAL_STATUS_FILE pointing to pinned native runtime status.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID, randomBytes, createHash } from 'node:crypto';

const statusFile = process.env.OBEDIENCE_LOCAL_STATUS_FILE;
test('atomic rule violation, punishment and Undo on isolated local fixtures', {
  skip: statusFile ? false : 'Requires reviewed local rule/punishment migration; no database execution without explicit local runtime.',
  timeout: 120_000,
}, async (t) => {
  assert.ok(statusFile.startsWith('/'));
  const status = JSON.parse(await readFile(statusFile, 'utf8'));
  assert.equal(status.runtime, 'native');
  assert.equal(status.env.API_URL, 'http://127.0.0.1:28622');
  assert.equal(new URL(status.env.DB_URL).hostname, '127.0.0.1');
  assert.equal(new URL(status.env.DB_URL).port, '20324');
  const api = status.env.API_URL, anon = status.env.ANON_KEY, service = status.env.SERVICE_ROLE_KEY;
  assert.ok(anon && service);
  const accounts = [];
  const fixturePeriods = new Set();
  const protectedTables = ['profiles','identity_contexts','rewards','reward_usage','rules','tasks','punishments',
    'task_completion_history','rule_violations','punishment_history','admin_document_readers'];
  const normalize = x => Array.isArray(x) ? x.map(normalize).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
    : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k,normalize(x[k])])) : x;
  const hash = x => createHash('sha256').update(JSON.stringify(normalize(x))).digest('hex');
  async function req(method,path,token=service,body) {
    assert.match(path,/^\/(auth|rest)\/v1\//);
    const url = new URL(path,api); assert.equal(url.origin,api);
    const response = await fetch(url,{method,headers:{apikey:token===service?service:anon,Authorization:`Bearer ${token}`,
      'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body),
      signal:AbortSignal.timeout(12_000),redirect:'error'});
    const text = await response.text(); let data; try { data=text?JSON.parse(text):null; } catch { data=null; }
    return {status:response.status,data};
  }
  const ok = r => { assert.ok(r.status>=200&&r.status<300,`API status ${r.status}; code ${r.data?.code??'none'}; message ${r.data?.message??'none'}`); return r.data; };
  const denied = (r,message) => { assert.ok(r.status>=400,`Expected rejection, got ${r.status}`); if(message) assert.equal(r.data?.message,message); };
  const rows = async (table,query='select=*',token=service) => ok(await req('GET',`/rest/v1/${table}?${query}`,token));
  const rpc = (a,name,body={}) => req('POST',`/rest/v1/rpc/${name}`,a?.token??anon,body);
  const identity = async a => ok(await rpc(a,'get_my_identity'));
  async function account(role) {
    const email=`recording-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('base64url');
    const user=ok(await req('POST','/auth/v1/admin/users',service,{email,password,email_confirm:true,user_metadata:{role}}));
    const a={id:user.id,token:null}; assert.ok(a.id); accounts.push(a);
    a.token=ok(await req('POST','/auth/v1/token?grant_type=password',anon,{email,password})).access_token;
    fixturePeriods.add((await identity(a)).relationship_id);
    return a;
  }
  async function link(dom,sub) {
    const invitation=ok(await rpc(dom,'generate_partner_link_code',{p_expected_relationship_id:(await identity(dom)).relationship_id,p_mode:'fresh',p_previous_relationship_id:null}));
    const result=ok(await rpc(sub,'accept_partner_link_code',{p_expected_relationship_id:(await identity(sub)).relationship_id,p_code:invitation.code,p_mode:'fresh',p_previous_relationship_id:null}));
    fixturePeriods.add(result.relationship_id); return result.relationship_id;
  }
  const setReady = async (a,value) => ok(await req('PATCH',`/rest/v1/identity_contexts?user_id=eq.${a.id}`,service,{lifecycle_ready:value}));
  let period,dom,sub,stranger,subParticipant,domParticipant;
  const body = (kind,rewardId,extra={}) => ({p_command_id:randomUUID(),p_expected_relationship_id:period,p_action:kind,
    ...(kind==='undo'?{p_event_id:rewardId}:{p_reward_id:rewardId}),...extra});
  const rewardCommand = (a,payload) => rpc(a,'execute_reward_command',payload);
  const command = (a,payload) => rpc(a,'execute_recording_command',payload);
  const record = (kind,id,extra={}) => ({p_command_id:randomUUID(),p_expected_relationship_id:period,p_action:kind,
    ...(kind==='rule_violation'?{p_rule_id:id}:{p_punishment_id:id}),...extra});
  const taskBody = (id,extra={}) => ({p_command_id:randomUUID(),p_expected_relationship_id:period,p_action:'task_complete',p_task_id:id,...extra});
  const undoBody = (id,extra={}) => ({p_command_id:randomUUID(),p_expected_relationship_id:period,p_event_id:id,...extra});
  const undo = (a,payload) => rpc(a,'undo_action',payload);
  const progress = async (a,type,id) => ok(await rpc(a,'get_recording_progress',{p_expected_relationship_id:period,p_subject_type:type,p_subject_id:id}));
  const balance = async currency => (await rows('action_wallets',`relationship_id=eq.${period}&currency=eq.${currency}&select=balance`))[0].balance;
  async function reward(owner,cost,supply=0,isDom=false) {
    const result=ok(await req('POST','/rest/v1/rewards',service,{title:'Synthetic accounting fixture',user_id:owner.id,
      relationship_id:period,cost,supply,is_dom_reward:isDom})); return result[0];
  }
  const activate = () => req('POST','/rest/v1/rpc/activate_action_accounting',service,{p_relationship_id:period});
  // Fail before fixture creation if migration is unavailable.
  await rows('rule_violations','relationship_id=eq.00000000-0000-0000-0000-000000000000&select=action_event_id');
  const original = new Map();
  for(const table of protectedTables) original.set(table,await rows(table));
  let rule,otherRule,punishment,zero,overflow,negative,domShop,subShop,task;
  let ruleReceipt,rulePayload,punishmentReceipt,punishmentPayload,secondPunishment;
  const subTZ='Etc/GMT+12',domTZ='Pacific/Kiritimati';
  const dateIn = (date,tz) => {
    const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(x=>[x.type,x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  };
  const monday = date => { const d=new Date(`${date}T00:00:00Z`);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10); };
  const newRule = async (owner=dom) => ok(await req('POST','/rest/v1/rules',service,{title:'Synthetic rule',user_id:owner.id,relationship_id:period,
    frequency:'daily',frequency_count:1,usage_data:[0,0,0,0,0,0,0]}))[0];
  const newPunishment = async (points,dom_points,owner=dom) => ok(await req('POST','/rest/v1/punishments',service,{title:'Synthetic punishment',
    user_id:owner.id,relationship_id:period,points,dom_points,dom_supply:0}))[0];
  const originalEvent = async receipt => (await rows('action_events',`id=eq.${receipt.eventIds[0]}&select=*`))[0];
  const entries = receipt => rows('action_point_entries',`event_id=eq.${receipt.eventIds[0]}&select=*&order=currency`);
  const snapshot = async () => Object.fromEntries(await Promise.all(['action_events','action_point_entries','action_wallets','profiles',
    'rule_violations','punishment_history','action_command_receipts','action_feedback_outbox'].map(async table=>[table,hash(await rows(table))])));
  let legacyRule,legacyPunishment;
  try {
    dom=await account('dom');sub=await account('sub');stranger=await account('sub');
    await setReady(dom,true);await setReady(sub,true);period=await link(dom,sub);
    await setReady(dom,false);await setReady(sub,false);
    domParticipant=(await identity(dom)).participant_id;subParticipant=(await identity(sub)).participant_id;
    ok(await rpc(dom,'set_my_timezone',{p_timezone:domTZ}));ok(await rpc(sub,'set_my_timezone',{p_timezone:subTZ}));
    ok(await req('PATCH',`/rest/v1/profiles?id=eq.${sub.id}`,service,{points:3,dom_points:22}));
    ok(await req('PATCH',`/rest/v1/profiles?id=eq.${dom.id}`,service,{points:33,dom_points:1}));
    rule=await newRule();otherRule=await newRule();punishment=await newPunishment(10,4);zero=await newPunishment(0,0);
    overflow=await newPunishment(2,2147483647);negative=await newPunishment(2,1);
    domShop=await reward(dom,9,0,true);subShop=await reward(sub,8);
    task=ok(await req('POST','/rest/v1/tasks',service,{title:'Synthetic task',user_id:sub.id,relationship_id:period,
      points:5,frequency:'daily',frequency_count:1,is_dom_task:false}))[0];
    const subMonday=monday(dateIn(new Date(),subTZ));
    const boundary=new Date(`${subMonday}T00:00:00Z`).getTime()+12*60*60*1000;
    const legacyRuleData={rule_id:rule.id,user_id:dom.id,relationship_id:period,day_of_week:6,week_number:'historical-format'};
    legacyRule=ok(await req('POST','/rest/v1/rule_violations',service,{...legacyRuleData,violation_date:new Date(boundary).toISOString()}))[0];
    ok(await req('POST','/rest/v1/rule_violations',service,{...legacyRuleData,violation_date:new Date(boundary-1).toISOString()}));
    legacyPunishment=ok(await req('POST','/rest/v1/punishment_history',service,{punishment_id:punishment.id,user_id:dom.id,
      relationship_id:period,day_of_week:6,points_deducted:99,applied_date:new Date(boundary).toISOString()}))[0];
    ok(await req('POST','/rest/v1/punishment_history',service,{punishment_id:punishment.id,user_id:dom.id,
      relationship_id:period,day_of_week:0,points_deducted:99,applied_date:null}));

    await t.test('service cutover freezes raw legacy history with count-only calendar and no fabricated point awards',async()=>{
      denied(await command(sub,record('rule_violation',rule.id)),'ACCOUNTING_NOT_ENABLED');
      denied(await rpc(sub,'activate_action_accounting',{p_relationship_id:period}));
      ok(await req('PATCH',`/rest/v1/profiles?id=eq.${sub.id}`,service,{timezone:null}));
      denied(await activate(),'TIMEZONE_REQUIRED');
      assert.equal((await rows('action_accounting_periods',`relationship_id=eq.${period}&select=*`)).length,0);
      ok(await rpc(sub,'set_my_timezone',{p_timezone:subTZ}));
      const before=await snapshot();ok(await activate());
      for(const table of ['profiles','rule_violations','punishment_history']) assert.equal(hash(await rows(table)),before[table]);
      assert.equal(await balance('sub'),3);assert.equal(await balance('dom'),1);
      const opening=(await rows('action_accounting_periods',`relationship_id=eq.${period}&select=source_snapshot`))[0].source_snapshot.recordingOpening;
      assert.equal(opening.timeZone,subTZ);assert.equal(opening.originalAwardValuesKnown,false);assert.equal(opening.historicalTimezoneKnown,false);
      assert.equal(opening.items.find(x=>x.subjectId===rule.id).history.length,2);
      assert.equal(opening.items.find(x=>x.subjectId===punishment.id).history.length,2);
      assert.equal((await progress(dom,'rule',rule.id)).currentCount,1);
      assert.equal((await progress(sub,'punishment',punishment.id)).currentCount,1);
      assert.equal((await rows('action_point_entries',`relationship_id=eq.${period}&reason=neq.opening_balance&select=id`)).length,0);
      denied(await undo(sub,undoBody(legacyRule.id)),'ACTION_NOT_REVERSIBLE');
      denied(await undo(dom,undoBody(legacyPunishment.id)),'ACTION_NOT_REVERSIBLE');
      denied(await rowsResponse('action_accounting_periods','select=source_snapshot',sub));
      assert.equal((await identity(sub)).lifecycle_ready,false);
    });

    await t.test('either actor may log violations repeatedly; retries are one event, never a point penalty or automatic punishment',async()=>{
      const beforeSub=await balance('sub'),beforeDom=await balance('dom'),beforePunishment=hash(await rows('punishment_history'));
      rulePayload=record('rule_violation',rule.id);
      const responses=await Promise.all([command(dom,rulePayload),command(dom,rulePayload)]);
      ruleReceipt=ok(responses[0]);assert.deepEqual(ok(responses[1]),ruleReceipt);
      assert.deepEqual(ruleReceipt.pointDeltas,[]);assert.equal(ruleReceipt.recordingProgress.currentCount,2);
      const e=await originalEvent(ruleReceipt);
      assert.equal(e.actor_participant_id,domParticipant);assert.equal(e.beneficiary_participant_id,subParticipant);assert.equal(e.definition_values,null);
      assert.equal(e.calendar.timeZone,subTZ);assert.equal(e.calendar.localDate,dateIn(new Date(e.recorded_at),subTZ));
      assert.equal(e.calendar.weekStartDate,monday(e.calendar.localDate));
      const h=(await rows('rule_violations',`action_event_id=eq.${e.id}&select=*`))[0];
      assert.equal(h.user_id,sub.id);assert.equal(h.violation_date,e.recorded_at);
      assert.equal(h.day_of_week,(new Date(`${e.calendar.localDate}T00:00:00Z`).getUTCDay()+6)%7);
      const next=ok(await command(sub,record('rule_violation',rule.id)));assert.equal(next.recordingProgress.currentCount,3);
      assert.equal(await balance('sub'),beforeSub);assert.equal(await balance('dom'),beforeDom);assert.equal(hash(await rows('punishment_history')),beforePunishment);
      denied(await command(dom,{...rulePayload,p_rule_id:otherRule.id}),'COMMAND_ID_REUSED');
      denied(await command(sub,rulePayload),'COMMAND_ACTOR_MISMATCH');
      const stable=hash(await rows('rules'));await progress(sub,'rule',rule.id);assert.equal(hash(await rows('rules')),stable);
    });

    await t.test('Punish clamps the actual Sub debit and awards full independent Dom points with both saved calendars',async()=>{
      punishmentPayload=record('punishment_apply',punishment.id);
      const responses=await Promise.all([command(dom,punishmentPayload),command(dom,punishmentPayload)]);
      punishmentReceipt=ok(responses[0]);assert.deepEqual(ok(responses[1]),punishmentReceipt);
      assert.deepEqual(punishmentReceipt.pointDeltas,[{participantId:domParticipant,currency:'dom',amount:4},{participantId:subParticipant,currency:'sub',amount:-3}]);
      assert.equal(await balance('sub'),0);assert.equal(await balance('dom'),5);
      const e=await originalEvent(punishmentReceipt),ledger=await entries(punishmentReceipt);
      assert.equal(e.definition_values.subDeduction,10);assert.equal(e.definition_values.domAward,4);
      assert.equal(e.definition_values.domAwardParticipantId,domParticipant);assert.equal(e.definition_values.domAwardOmittedReason,null);
      for(const row of ledger) {
        const tz=row.currency==='dom'?domTZ:subTZ;
        assert.equal(row.calendar.timeZone,tz);assert.equal(row.calendar.participantId,row.participant_id);
        assert.equal(row.calendar.localDate,dateIn(new Date(e.recorded_at),tz));assert.equal(row.calendar.weekStartDate,monday(row.calendar.localDate));
      }
      assert.notEqual(ledger[0].calendar.localDate,ledger[1].calendar.localDate);
      const h=(await rows('punishment_history',`action_event_id=eq.${e.id}&select=*`))[0];
      assert.equal(h.points_deducted,3);assert.equal(h.user_id,sub.id);assert.equal(h.applied_date,e.recorded_at);
      secondPunishment=ok(await command(sub,record('punishment_apply',punishment.id)));
      assert.equal(secondPunishment.pointDeltas.find(x=>x.currency==='sub').amount,0);assert.equal(await balance('dom'),9);
      assert.equal(secondPunishment.recordingProgress.currentCount,3);
      assert.equal((await rows('punishments',`id=eq.${punishment.id}&select=dom_supply`))[0].dom_supply,0);
      assert.equal(punishmentReceipt.feedback.length,2);
      assert.equal((await rows('action_feedback_outbox',`event_id=eq.${e.id}&select=*`)).length,2);
    });

    await t.test('all four recording and Undo permissions apply to new commands, while confirmed retry receipts remain stable',async()=>{
      ok(await rpc(dom,'set_relationship_permissions',{p_expected_relationship_id:period,p_permissions:{rule_violation:'dom',rule_violation_undo:'dom',punishment_apply:'sub',punishment_undo:'sub'}}));
      assert.deepEqual(ok(await command(dom,punishmentPayload)),punishmentReceipt);
      denied(await command(sub,record('rule_violation',otherRule.id)),'ACTION_NOT_ALLOWED');
      denied(await command(dom,record('punishment_apply',zero.id)),'ACTION_NOT_ALLOWED');
      denied(await undo(sub,undoBody(ruleReceipt.eventIds[0])),'ACTION_NOT_ALLOWED');
      denied(await undo(dom,undoBody(punishmentReceipt.eventIds[0])),'ACTION_NOT_ALLOWED');
      const allowed=ok(await command(sub,record('punishment_apply',zero.id)));ok(await undo(sub,undoBody(allowed.eventIds[0])));
      ok(await rpc(dom,'set_relationship_permissions',{p_expected_relationship_id:period,p_permissions:{rule_violation:'both',rule_violation_undo:'both',punishment_apply:'both',punishment_undo:'both'}}));
    });

    await t.test('rule Undo retains immutable original and reversal, changes only one count, and preserves legacy history',async()=>{
      const original=await originalEvent(ruleReceipt),payload=undoBody(original.id);
      const receipt=ok(await undo(sub,payload));assert.deepEqual(ok(await undo(sub,payload)),receipt);
      assert.equal(receipt.recordingProgress.currentCount,2);assert.deepEqual(receipt.pointDeltas,[]);
      assert.deepEqual((await rows('action_events',`id=eq.${original.id}&select=*`))[0],original);
      assert.equal((await originalEvent(receipt)).reverses_event_id,original.id);
      assert.equal((await rows('rule_violations',`action_event_id=eq.${original.id}&select=*`)).length,0);
      assert.equal((await rows('rule_violations',`id=eq.${legacyRule.id}&select=*`)).length,1);
      denied(await undo(dom,undoBody(original.id)),'ACTION_ALREADY_UNDONE');
      denied(await undo(sub,undoBody(receipt.eventIds[0])),'ACTION_NOT_REVERSIBLE');
      denied(await req('POST','/rest/v1/rule_violations',sub.token,{rule_id:rule.id,user_id:sub.id,relationship_id:period,
        violation_date:original.recorded_at,day_of_week:0,week_number:'x',action_event_id:original.id}),'ATOMIC_ACTION_COMMAND_REQUIRED');
    });

    await t.test('spent Dom award Undo reverses exact original amounts after definition edit and soft removal',async()=>{
      const purchase=ok(await rewardCommand(dom,body('reward_buy',domShop.id,{p_expected_cost:9})));
      assert.equal(await balance('dom'),0);
      ok(await req('PATCH',`/rest/v1/punishments?id=eq.${punishment.id}`,dom.token,{points:100,dom_points:99,title:'Edited after recording',deleted_at:new Date().toISOString()}));
      const receipt=ok(await undo(sub,undoBody(punishmentReceipt.eventIds[0])));
      assert.equal(await balance('sub'),3);assert.equal(await balance('dom'),-4);
      assert.deepEqual(receipt.pointDeltas,[{participantId:domParticipant,currency:'dom',amount:-4},{participantId:subParticipant,currency:'sub',amount:3}]);
      assert.equal(receipt.recordingProgress.deleted,true);assert.equal(receipt.recordingProgress.currentCount,2);
      const e=await originalEvent(receipt);assert.equal(e.subject.title,'Synthetic punishment');assert.equal(e.definition_values.subDeduction,10);
      assert.deepEqual((await entries(receipt)).map(x=>x.calendar),(await entries(punishmentReceipt)).map(x=>x.calendar));
      assert.equal((await rows('punishment_history',`id=eq.${legacyPunishment.id}&select=*`))[0].points_deducted,99);
      denied(await command(sub,record('punishment_apply',punishment.id)),'DEFINITION_DELETED');
      denied(await undo(dom,undoBody(punishmentReceipt.eventIds[0])),'ACTION_ALREADY_UNDONE');
      denied(await rewardCommand(dom,body('reward_buy',domShop.id,{p_expected_cost:9})),'INSUFFICIENT_POINTS');
      // The shared dispatcher still routes accepted reward events correctly.
      ok(await undo(dom,undoBody(purchase.eventIds[0])));assert.equal(await balance('dom'),5);
    });

    await t.test('new punishment cannot forgive a negative correction balance; zero amounts remain recordable',async()=>{
      const completed=ok(await rpc(sub,'execute_task_command',taskBody(task.id)));assert.equal(await balance('sub'),8);
      ok(await rewardCommand(sub,body('reward_buy',subShop.id,{p_expected_cost:8})));assert.equal(await balance('sub'),0);
      ok(await undo(dom,undoBody(completed.eventIds[0])));assert.equal(await balance('sub'),-5);
      const receipt=ok(await command(sub,record('punishment_apply',negative.id)));
      assert.equal(receipt.pointDeltas.find(x=>x.currency==='sub').amount,0);assert.equal(await balance('sub'),-5);
      ok(await undo(dom,undoBody(receipt.eventIds[0])));assert.equal(await balance('sub'),-5);
      const noChange=ok(await command(dom,record('punishment_apply',zero.id)));
      assert.deepEqual(noChange.pointDeltas,[{participantId:subParticipant,currency:'sub',amount:0}]);
      assert.equal((await originalEvent(noChange)).definition_values.domAwardOmittedReason,'zero_configured_award');
      assert.equal(noChange.feedback.length,1);ok(await undo(sub,undoBody(noChange.eventIds[0])));
    });

    await t.test('a failure after the Sub delta rolls back both wallets, history, outbox and receipt',async()=>{
      ok(await req('PATCH',`/rest/v1/tasks?id=eq.${task.id}`,dom.token,{points:10}));
      ok(await rpc(sub,'execute_task_command',taskBody(task.id)));assert.equal(await balance('sub'),5);
      const before=await snapshot(),payload=record('punishment_apply',overflow.id);
      const failed=await command(dom,payload);denied(failed);assert.equal(failed.data.code,'22003');
      assert.deepEqual(await snapshot(),before);
      assert.equal((await rows('action_command_receipts',`command_id=eq.${payload.p_command_id}&select=id`)).length,0);
    });

    await t.test('enabled definitions/history reject legacy bypasses, untrusted callers, bad input and erased evidence',async()=>{
      const now=new Date().toISOString();
      denied(await req('PATCH',`/rest/v1/rules?id=eq.${rule.id}`,sub.token,{usage_data:[1,1,1,1,1,1,1]}),'ATOMIC_ACTION_COMMAND_REQUIRED');
      denied(await req('DELETE',`/rest/v1/rules?id=eq.${rule.id}`,sub.token),'DEFINITION_SOFT_DELETE_REQUIRED');
      denied(await req('DELETE',`/rest/v1/punishments?id=eq.${zero.id}`,sub.token),'DEFINITION_SOFT_DELETE_REQUIRED');
      denied(await req('POST','/rest/v1/rule_violations',sub.token,{rule_id:rule.id,user_id:sub.id,violation_date:now,day_of_week:0,week_number:'x'}),'ATOMIC_ACTION_COMMAND_REQUIRED');
      denied(await req('POST','/rest/v1/punishment_history',sub.token,{punishment_id:zero.id,user_id:sub.id,applied_date:now,day_of_week:0,points_deducted:100}),'ATOMIC_ACTION_COMMAND_REQUIRED');
      denied(await req('DELETE',`/rest/v1/punishment_history?id=eq.${legacyPunishment.id}`,sub.token),'ATOMIC_ACTION_COMMAND_REQUIRED');
      denied(await req('PATCH',`/rest/v1/punishments?id=eq.${zero.id}`,sub.token,{points:-1}),'INVALID_PUNISHMENT_DEFINITION');
      ok(await rpc(dom,'set_relationship_permissions',{p_expected_relationship_id:period,p_permissions:{definition_manage:'dom'}}));
      denied(await req('PATCH',`/rest/v1/rules?id=eq.${rule.id}`,sub.token,{title:'Disallowed'}),'ACTION_NOT_ALLOWED');
      ok(await req('PATCH',`/rest/v1/rules?id=eq.${rule.id}`,dom.token,{deleted_at:now}));
      denied(await command(sub,record('rule_violation',rule.id)),'DEFINITION_DELETED');
      denied(await command(stranger,record('rule_violation',otherRule.id)),'STALE_RELATIONSHIP');
      denied(await command(null,record('punishment_apply',zero.id)));
      denied(await command(sub,record('punishment_apply',zero.id,{p_rule_id:otherRule.id})),'INVALID_ACTION_COMMAND');
      denied(await command(sub,record('rule_violation',otherRule.id,{p_expected_relationship_id:randomUUID()})),'STALE_RELATIONSHIP');
      denied(await rpc(sub,'_actions_recording_calendar',{p_period:period,p_participant:domParticipant,p_at:now}));
      denied(await req('PATCH',`/rest/v1/action_point_entries?event_id=eq.${punishmentReceipt.eventIds[0]}`,sub.token,{amount:999}));
      denied(await req('PATCH',`/rest/v1/profiles?id=eq.${sub.id}`,sub.token,{points:999}),'ATOMIC_BALANCE_COMMAND_REQUIRED');
      assert.equal((await rows('action_events',`relationship_id=eq.${period}&select=id`,stranger.token)).length,0);
    });

    await t.test('solo Sub records without a phantom Dom, and solo Dom gets a clear missing-Sub rejection',async()=>{
      const paired=period;
      const soloSub=await account('sub'),soloDom=await account('dom');
      ok(await rpc(soloSub,'set_my_timezone',{p_timezone:subTZ}));ok(await rpc(soloDom,'set_my_timezone',{p_timezone:domTZ}));
      for(const [a,role] of [[soloSub,'sub'],[soloDom,'dom']]) {
        period=(await identity(a)).relationship_id;
        const r=await newRule(a),p=await newPunishment(10,4,a);
        ok(await req('PATCH',`/rest/v1/profiles?id=eq.${a.id}`,service,{points:2,dom_points:5}));ok(await activate());
        if(role==='sub') {
          const receipt=ok(await command(a,record('punishment_apply',p.id)));
          assert.equal(receipt.pointDeltas.length,1);assert.equal(receipt.pointDeltas[0].amount,-2);
          assert.equal((await originalEvent(receipt)).definition_values.domAwardOmittedReason,'dom_participant_absent');
          assert.equal((await rows('action_wallets',`relationship_id=eq.${period}&select=*`)).length,1);
          ok(await command(a,record('rule_violation',r.id)));ok(await undo(a,undoBody(receipt.eventIds[0])));assert.equal(await balance('sub'),2);
        } else {
          denied(await command(a,record('rule_violation',r.id)),'SUB_PARTICIPANT_REQUIRED');
          denied(await command(a,record('punishment_apply',p.id)),'SUB_PARTICIPANT_REQUIRED');
        }
      }
      period=paired;
    });

    await t.test('fresh same-pair periods cannot inherit old counts or reverse old activity',async()=>{
      const previous=period;await setReady(dom,true);await setReady(sub,true);
      const solo=ok(await rpc(dom,'unlink_my_partner',{p_expected_relationship_id:period}));fixturePeriods.add(solo.relationship_id);
      fixturePeriods.add((await identity(sub)).relationship_id);period=await link(dom,sub);
      denied(await undo(dom,undoBody(secondPunishment.eventIds[0],{p_expected_relationship_id:previous})),'STALE_RELATIONSHIP');
      const r=await newRule();ok(await activate());assert.equal((await progress(sub,'rule',r.id)).currentCount,0);
      assert.equal(await balance('sub'),0);assert.equal(await balance('dom'),0);
      denied(await command(sub,record('rule_violation',otherRule.id)),'RECORDING_SUBJECT_NOT_FOUND');
      assert.equal((await rows('action_events',`relationship_id=eq.${previous}&select=id`,sub.token)).length,0);
    });
  } finally {
    const fixtureIds=accounts.map(a=>a.id);
    if(fixtureIds.length) for(const m of await rows('relationship_period_members',`user_id=in.(${fixtureIds.join(',')})&select=relationship_id`)) fixturePeriods.add(m.relationship_id);
    for(const id of fixturePeriods) {
      for(const table of ['action_feedback_acknowledgments','action_feedback_outbox','action_command_receipts','reward_usage','task_completion_history',
        'rule_violations','punishment_history','action_inventory_movements','action_point_entries','reward_inventory_lots','action_events',
        'action_task_openings','action_wallets','action_accounting_periods','rewards','tasks','rules','punishments']) {
        ok(await req('DELETE',`/rest/v1/${table}?relationship_id=eq.${id}`,service));
      }
    }
    for(const a of accounts) ok(await req('PATCH',`/rest/v1/profiles?id=eq.${a.id}`,service,{linked_partner_id:null}));
    for(const a of accounts) ok(await req('DELETE',`/auth/v1/admin/users/${a.id}`,service));
    for(const id of fixturePeriods) {
      ok(await req('DELETE',`/rest/v1/relationship_period_members?relationship_id=eq.${id}`,service));
      ok(await req('DELETE',`/rest/v1/relationship_periods?id=eq.${id}`,service));
    }
    for(const table of protectedTables) assert.equal(hash(await rows(table)),hash(original.get(table)),`Original ${table} changed`);
  }
  function rowsResponse(table,query,a) { return req('GET',`/rest/v1/${table}?${query}`,a.token); }
});
