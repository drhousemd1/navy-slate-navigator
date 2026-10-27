/** Local real API tests for the reviewed task migration. Never applies SQL or activates original accounts.
 * Run after parent review/apply with OBEDIENCE_LOCAL_STATUS_FILE pointing to pinned native runtime status.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID, randomBytes, createHash } from 'node:crypto';

const statusFile = process.env.OBEDIENCE_LOCAL_STATUS_FILE;
test('atomic task completion and Undo on isolated local fixtures', {
  skip: statusFile ? false : 'Requires reviewed local task migration; no database execution without explicit local runtime.',
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
  // Captured reviewed scope. Payload construction freezes the generation;
  // retries never refresh/rebind an existing intent to another session.
  const reviewedSessions=new Map(),accountSessions=new Map();
  const scopeFor=id=>({p_expected_relationship_id:id,p_expected_relationship_session_id:reviewedSessions.get(id)});
  const protectedTables = ['profiles','identity_contexts','rewards','reward_usage','rules','tasks','punishments',
    'task_completion_history','rule_violations','punishment_history','admin_document_readers'];
  const normalize = x => Array.isArray(x) ? x.map(normalize).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
    : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k,normalize(x[k])])) : x;
  const hash = x => createHash('sha256').update(JSON.stringify(normalize(x))).digest('hex');
  async function req(method,path,token=service,body) {
    assert.match(path,/^\/(auth|rest)\/v1\//);
    const url = new URL(path,api); assert.equal(url.origin,api);
    const response = await fetch(url,{method,headers:{apikey:token===service?service:anon,Authorization:`Bearer ${token}`,
      'Content-Type':'application/json',Prefer:'return=representation',
      ...(accountSessions.has(token)?{'x-relationship-session-id':accountSessions.get(token)}:{})},body:body===undefined?undefined:JSON.stringify(body),
      signal:AbortSignal.timeout(12_000),redirect:'error'});
    const text = await response.text(); let data; try { data=text?JSON.parse(text):null; } catch { data=null; }
    return {status:response.status,data};
  }
  const ok = r => { assert.ok(r.status>=200&&r.status<300,`API status ${r.status}; code ${r.data?.code??'none'}; message ${r.data?.message??'none'}`); return r.data; };
  const denied = (r,message) => { assert.ok(r.status>=400,`Expected rejection, got ${r.status}`); if(message) assert.equal(r.data?.message,message); };
  const rows = async (table,query='select=*',token=service) => ok(await req('GET',`/rest/v1/${table}?${query}`,token));
  const rpc = (a,name,body={}) => req('POST',`/rest/v1/rpc/${name}`,a?.token??anon,body);
  const identity = async a => {
    const result=ok(await rpc(a,'get_my_identity'));
    assert.ok(result.relationship_session_id,'Apply reviewed session migration before fixtures');
    reviewedSessions.set(result.relationship_id,result.relationship_session_id);
    accountSessions.set(a.token,result.relationship_session_id);
    return result;
  };
  async function account(role) {
    const email=`reward-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('base64url');
    const user=ok(await req('POST','/auth/v1/admin/users',service,{email,password,email_confirm:true,user_metadata:{role}}));
    const a={id:user.id,token:null}; assert.ok(a.id); accounts.push(a);
    a.token=ok(await req('POST','/auth/v1/token?grant_type=password',anon,{email,password})).access_token;
    fixturePeriods.add((await identity(a)).relationship_id);
    return a;
  }
  async function link(dom,sub) {
    const invitation=ok(await rpc(dom,'generate_partner_link_code',{...scopeFor((await identity(dom)).relationship_id),p_mode:'fresh',p_previous_relationship_id:null}));
    const result=ok(await rpc(sub,'accept_partner_link_code',{...scopeFor((await identity(sub)).relationship_id),p_code:invitation.code,p_mode:'fresh',p_previous_relationship_id:null}));
    fixturePeriods.add(result.relationship_id);await identity(dom);await identity(sub);return result.relationship_id;
  }
  // Service-only construction of a synthetic imported existing pair. This is
  // NOT the Fresh product flow: no accounting exists until the cutover test.
  async function seedImportedPair(dom,sub) {
    assert.notEqual(dom.id,sub.id);
    const candidates=[dom,sub],oldPeriods=[];
    const originalIds=new Set(original.get('profiles').map(p=>p.id));
    for(const [a,role] of [[dom,'dom'],[sub,'sub']]) {
      assert.ok(accounts.some(x=>x.id===a.id) && !originalIds.has(a.id));
      const p=await rows('profiles',`id=eq.${a.id}&select=*`);
      const c=await rows('identity_contexts',`user_id=eq.${a.id}&select=*`);
      assert.equal(p.length,1);assert.equal(p[0].role,role);assert.equal(p[0].linked_partner_id,null);
      assert.equal(c.length,1);assert.equal(c[0].lifecycle_ready,false);
      const old=c[0].relationship_id;assert.ok(fixturePeriods.has(old));oldPeriods.push(old);
      const r=await rows('relationship_periods',`id=eq.${old}&select=*`);
      const m=await rows('relationship_period_members',`relationship_id=eq.${old}&select=*`);
      assert.equal(r.length,1);assert.equal(r[0].status,'active');assert.equal(m.length,1);
      assert.equal(m[0].user_id,a.id);assert.equal(m[0].role,role);
      for(const table of ['action_accounting_periods','action_wallets','action_events','action_command_receipts',
        'rules','tasks','rewards','punishments','rule_violations','task_completion_history','reward_usage',
        'punishment_history','wellbeing_snapshots','messages','archived_messages'])
        assert.equal((await rows(table,`relationship_id=eq.${old}&select=relationship_id`)).length,0,`New solo ${table} must be empty`);
      assert.equal((await rows('partner_link_invitations',`user_id=eq.${a.id}&select=user_id`)).length,0);
    }
    assert.equal(new Set(oldPeriods).size,2);
    const id=randomUUID();fixturePeriods.add(id); // Track before the first write/lost response.
    const members=candidates.map((a,index)=>({participant_id:randomUUID(),relationship_id:id,user_id:a.id,role:index===0?'dom':'sub'}));
    ok(await req('POST','/rest/v1/relationship_periods',service,{id}));
    ok(await req('POST','/rest/v1/relationship_period_members',service,members));
    for(const a of candidates)ok(await req('PATCH',`/rest/v1/identity_contexts?user_id=eq.${a.id}`,service,{relationship_id:id,lifecycle_ready:false}));
    ok(await req('PATCH',`/rest/v1/profiles?id=eq.${dom.id}`,service,{linked_partner_id:sub.id}));
    ok(await req('PATCH',`/rest/v1/profiles?id=eq.${sub.id}`,service,{linked_partner_id:dom.id}));
    for(const old of oldPeriods)ok(await req('PATCH',`/rest/v1/relationship_periods?id=eq.${old}`,service,{status:'archived',ended_at:new Date().toISOString()}));
    const saved=await rows('relationship_period_members',`relationship_id=eq.${id}&select=participant_id,relationship_id,user_id,role`);
    assert.deepEqual(saved.sort((a,b)=>a.participant_id.localeCompare(b.participant_id)),members.sort((a,b)=>a.participant_id.localeCompare(b.participant_id)));
    assert.equal((await rows('action_accounting_periods',`relationship_id=eq.${id}&select=relationship_id`)).length,0);
    for(const a of candidates){const i=await identity(a);assert.equal(i.status,'ready_linked');assert.equal(i.relationship_id,id);assert.equal(i.lifecycle_ready,false);}
    return id;
  }
  const setReady = async (a,value) => ok(await req('PATCH',`/rest/v1/identity_contexts?user_id=eq.${a.id}`,service,{lifecycle_ready:value}));
  let period,dom,sub,stranger,subParticipant,domParticipant;
  const body = (kind,rewardId,extra={}) => ({p_command_id:randomUUID(),...scopeFor(period),p_action:kind,
    ...(kind==='undo'?{p_event_id:rewardId}:{p_reward_id:rewardId}),...extra});
  const rewardCommand = (a,payload) => rpc(a,'execute_reward_command',payload);
  const command = (a,payload) => rpc(a,'execute_task_command',payload);
  // Build context only for a NEW intended action. command() never refreshes a
  // saved payload; explicit guard probes below retain their captured context.
  const taskProbe = (id,extra={}) => ({p_command_id:randomUUID(),...scopeFor(period),p_action:'task_complete',p_task_id:id,...extra});
  const taskBody = async (id,extra={}) => {
    const reviewed=await progress(dom,id);assert.ok(reviewed.expectedContext);
    return {...taskProbe(id),p_expected_context:structuredClone(reviewed.expectedContext),...extra};
  };
  const undoBody = (id,extra={}) => ({p_command_id:randomUUID(),...scopeFor(period),p_event_id:id,...extra});
  const undo = (a,payload) => rpc(a,'undo_action',payload);
  const progress = async (a,id) => ok(await rpc(a,'get_task_progress',{p_expected_relationship_id:period,p_task_id:id}));
  const balance = async currency => (await rows('action_wallets',`relationship_id=eq.${period}&currency=eq.${currency}&select=balance`))[0].balance;
  const quantity = async reward => (await rows('reward_inventory_lots',`reward_id=eq.${reward.id}&status=eq.available&select=id`)).length;
  async function reward(owner,cost,supply=0,isDom=false) {
    const result=ok(await req('POST','/rest/v1/rewards',service,{title:'Synthetic accounting fixture',user_id:owner.id,
      relationship_id:period,cost,supply,is_dom_reward:isDom})); return result[0];
  }
  const activate = () => req('POST','/rest/v1/rpc/activate_action_accounting',service,{p_relationship_id:period});
  // Fail before fixture creation if migration is unavailable.
  await rows('action_task_openings','relationship_id=eq.00000000-0000-0000-0000-000000000000&select=relationship_id');
  await rows('relationship_periods','select=relationship_session_id&limit=0');
  const original = new Map();
  for(const table of protectedTables) original.set(table,await rows(table));
  let daily,weekly,zero,spend,permissionTask,race,deleted,shop,dailyReceipt,dailyPayload;
  const subTZ='Etc/GMT+12',domTZ='Pacific/Kiritimati';
  const dateIn = (date,tz) => {
    const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(x=>[x.type,x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  };
  const monday = date => { const d=new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7); return d.toISOString().slice(0,10); };
  async function task(points,target=1,frequency='daily',isDom=false) {
    return ok(await req('POST','/rest/v1/tasks',service,{title:'Synthetic task',user_id:sub.id,relationship_id:period,
      points,frequency,frequency_count:target,is_dom_task:isDom}))[0];
  }
  async function legacyHistory(task,at) {
    return ok(await req('POST','/rest/v1/task_completion_history',service,{task_id:task.id,user_id:dom.id,relationship_id:period,completed_at:at}))[0];
  }
  let legacyDailyRows=[];
  try {
    dom=await account('dom'); sub=await account('sub'); stranger=await account('sub');
    period=await seedImportedPair(dom,sub);
    domParticipant=(await identity(dom)).participant_id; subParticipant=(await identity(sub)).participant_id;
    ok(await rpc(dom,'set_my_timezone',{p_timezone:domTZ}));
    ok(await rpc(sub,'set_my_timezone',{p_timezone:subTZ}));
    ok(await req('PATCH',`/rest/v1/profiles?id=eq.${sub.id}`,service,{points:0,dom_points:22}));
    ok(await req('PATCH',`/rest/v1/profiles?id=eq.${dom.id}`,service,{points:33,dom_points:10}));
    daily=await task(5,3); weekly=await task(7,2,'weekly',true); zero=await task(0); spend=await task(10);
    permissionTask=await task(2,4); race=await task(3); deleted=await task(4); shop=await reward(sub,1);
    const now=new Date(),subDate=dateIn(now,subTZ),domDate=dateIn(now,domTZ),domMonday=monday(domDate);
    legacyDailyRows=[await legacyHistory(daily,new Date(now.getTime()-1000).toISOString()),await legacyHistory(daily,new Date(now.getTime()-500).toISOString())];
    // Kiritimati Monday midnight is Sunday 10:00Z. The prior instant must not count.
    const weekStart=new Date(`${domMonday}T00:00:00Z`).getTime()-14*60*60*1000;
    await legacyHistory(weekly,new Date(weekStart).toISOString());
    await legacyHistory(weekly,new Date(weekStart-1).toISOString());

    await t.test('activation preserves count-only history, fails atomically without saved timezone, and fabricates no awards',async()=>{
      denied(await command(dom,taskProbe(daily.id)),'ACCOUNTING_NOT_ENABLED');
      ok(await req('PATCH',`/rest/v1/profiles?id=eq.${sub.id}`,service,{timezone:null}));
      denied(await activate(),'TIMEZONE_REQUIRED');
      assert.equal((await rows('action_accounting_periods',`relationship_id=eq.${period}&select=*`)).length,0);
      assert.equal((await rows('action_events',`relationship_id=eq.${period}&select=id`)).length,0);
      ok(await rpc(sub,'set_my_timezone',{p_timezone:subTZ}));
      const before=await rows('tasks',`relationship_id=eq.${period}&select=*`);
      ok(await activate());
      assert.equal(hash(await rows('tasks',`relationship_id=eq.${period}&select=*`)),hash(before));
      assert.equal(await balance('sub'),0); assert.equal(await balance('dom'),10);
      const opening=(await rows('action_task_openings',`task_id=eq.${daily.id}&select=*`))[0];
      assert.equal(opening.timezone,subTZ); assert.equal(opening.source_snapshot.history.length,2);
      assert.equal(opening.source_snapshot.originalAwardValuesKnown,false);
      assert.equal((await progress(dom,daily.id)).currentCount,2);
      assert.equal((await progress(sub,weekly.id)).currentCount,1);
      denied(await undo(sub,undoBody(legacyDailyRows[0].id)),'ACTION_NOT_REVERSIBLE');
      denied(await req('GET',`/rest/v1/action_task_openings?task_id=eq.${daily.id}&select=*`,sub.token));
      assert.equal((await identity(sub)).lifecycle_ready,false);
    });

    await t.test('both actors complete the intended role task; retry is identical and each accepted completion awards once',async()=>{
      dailyPayload=await taskBody(daily.id);
      const results=await Promise.all([command(dom,dailyPayload),command(dom,dailyPayload)]);
      dailyReceipt=ok(results[0]); assert.deepEqual(ok(results[1]),dailyReceipt);
      assert.equal(dailyReceipt.taskProgress.currentCount,3); assert.equal(dailyReceipt.taskProgress.completed,true);
      assert.deepEqual(dailyReceipt.pointDeltas,[{participantId:subParticipant,currency:'sub',amount:5}]);
      assert.equal(await balance('sub'),5); assert.equal(await balance('dom'),10);
      const originalEvent=(await rows('action_events',`id=eq.${dailyReceipt.eventIds[0]}&select=*`))[0];
      assert.equal(originalEvent.actor_participant_id,domParticipant); assert.equal(originalEvent.beneficiary_participant_id,subParticipant);
      assert.equal(originalEvent.calendar.timeZone,subTZ); assert.equal(originalEvent.calendar.localDate,subDate);
      assert.equal(originalEvent.calendar.weekStartDate,monday(subDate));
      const h=(await rows('task_completion_history',`action_event_id=eq.${originalEvent.id}&select=*`))[0];
      assert.equal(h.user_id,sub.id); assert.equal(h.completed_at,originalEvent.recorded_at);
      denied(await command(sub,await taskBody(daily.id)),'TASK_TARGET_REACHED');
      denied(await command(dom,{...dailyPayload,p_task_id:weekly.id}),'COMMAND_ID_REUSED');
      denied(await command(sub,dailyPayload),'COMMAND_ACTOR_MISMATCH');
      const completeDom=ok(await command(sub,await taskBody(weekly.id)));
      assert.equal(completeDom.taskProgress.timeZone,domTZ); assert.equal(completeDom.taskProgress.localDate,domDate);
      assert.equal(completeDom.taskProgress.currentCount,2); assert.equal(completeDom.pointDeltas[0].currency,'dom');
      assert.equal(await balance('dom'),17);
      denied(await command(dom,await taskBody(weekly.id)),'TASK_TARGET_REACHED');
    });

    await t.test('current permissions apply to new actions while accepted command retries stay confirmed',async()=>{
      ok(await rpc(dom,'set_relationship_permissions',{...scopeFor(period),p_permissions:{task_complete:'sub',task_undo:'sub'}}));
      assert.deepEqual(ok(await command(dom,dailyPayload)),dailyReceipt);
      denied(await command(dom,await taskBody(permissionTask.id)),'ACTION_NOT_ALLOWED');
      const allowed=ok(await command(sub,await taskBody(permissionTask.id)));
      denied(await undo(dom,undoBody(allowed.eventIds[0])),'ACTION_NOT_ALLOWED');
      ok(await undo(sub,undoBody(allowed.eventIds[0])));
      ok(await rpc(dom,'set_relationship_permissions',{...scopeFor(period),p_permissions:{task_complete:'both',task_undo:'both'}}));
    });

    await t.test('Undo preserves original events, restores capacity, and rejects duplicate/legacy/reinserted history',async()=>{
      const payload=undoBody(dailyReceipt.eventIds[0]);
      const reversed=ok(await undo(sub,payload));
      assert.equal(reversed.taskProgress.currentCount,2); assert.equal(await balance('sub'),0);
      assert.deepEqual(ok(await undo(sub,payload)),reversed);
      denied(await undo(dom,undoBody(dailyReceipt.eventIds[0])),'ACTION_ALREADY_UNDONE');
      denied(await undo(sub,undoBody(reversed.eventIds[0])),'ACTION_NOT_REVERSIBLE');
      const event=(await rows('action_events',`id=eq.${dailyReceipt.eventIds[0]}&select=*`))[0];
      assert.equal(event.kind,'task_completed');
      assert.equal((await rows('action_events',`reverses_event_id=eq.${event.id}&select=id`)).length,1);
      assert.equal((await rows('task_completion_history',`action_event_id=eq.${event.id}&select=id`)).length,0);
      denied(await req('POST','/rest/v1/task_completion_history',sub.token,{task_id:daily.id,user_id:sub.id,completed_at:event.recorded_at,action_event_id:event.id}),'ATOMIC_ACTION_COMMAND_REQUIRED');
      assert.equal((await rows('task_completion_history',`task_id=eq.${daily.id}&action_event_id=is.null&select=id`)).length,2);
      const again=ok(await command(sub,await taskBody(daily.id)));
      assert.equal(again.taskProgress.currentCount,3); assert.equal(await balance('sub'),5);
    });

    await t.test('spent award Undo creates the exact negative balance despite task title, value, role and frequency edits',async()=>{
      const completion=ok(await command(dom,await taskBody(spend.id)));
      const before=await balance('sub'); assert.equal(before,15);
      ok(await req('PATCH',`/rest/v1/rewards?id=eq.${shop.id}`,dom.token,{cost:before}));
      const purchase=ok(await rewardCommand(sub,{...body('reward_buy',shop.id),p_expected_cost:before}));
      assert.equal(await balance('sub'),0);
      ok(await req('PATCH',`/rest/v1/tasks?id=eq.${spend.id}`,dom.token,{title:'Edited task',points:99,is_dom_task:true,frequency:'weekly',frequency_count:4}));
      const domBefore=await balance('dom');
      const reversed=ok(await undo(sub,undoBody(completion.eventIds[0])));
      assert.deepEqual(reversed.pointDeltas,[{participantId:subParticipant,currency:'sub',amount:-10}]);
      assert.equal(await balance('sub'),-10); assert.equal(await balance('dom'),domBefore);
      const original=(await rows('action_events',`id=eq.${completion.eventIds[0]}&select=*`))[0];
      assert.equal(original.subject.title,'Synthetic task'); assert.equal(original.definition_values.points,10); assert.equal(original.subject.role,'sub');
      denied(await rewardCommand(sub,{...body('reward_buy',shop.id),p_expected_cost:before}),'INSUFFICIENT_POINTS');
      // The shared dispatcher also preserves the accepted reward Undo path.
      const purchaseUndo=ok(await undo(sub,undoBody(purchase.eventIds[0])));
      assert.equal(purchaseUndo.refunds[0].total,15); assert.equal(await balance('sub'),5);
    });

    await t.test('zero-point completions and definition edits preserve progress without retroactive pricing',async()=>{
      const zeroReceipt=ok(await command(sub,await taskBody(zero.id)));
      assert.equal(zeroReceipt.pointDeltas[0].amount,0); assert.equal(await balance('sub'),5);
      ok(await undo(dom,undoBody(zeroReceipt.eventIds[0]))); assert.equal(await balance('sub'),5);
      ok(await req('PATCH',`/rest/v1/tasks?id=eq.${daily.id}`,dom.token,{points:50,frequency_count:2}));
      assert.equal((await progress(dom,daily.id)).currentCount,3);
      denied(await command(sub,await taskBody(daily.id)),'TASK_TARGET_REACHED');
      ok(await req('PATCH',`/rest/v1/tasks?id=eq.${daily.id}`,dom.token,{frequency:'weekly',frequency_count:4}));
      assert.equal((await progress(dom,daily.id)).currentCount,3);
      const extra=ok(await command(dom,await taskBody(daily.id)));
      assert.equal(extra.pointDeltas[0].amount,50); assert.equal(extra.taskProgress.currentCount,4);
      denied(await command(sub,await taskBody(daily.id)),'TASK_TARGET_REACHED');
    });

    await t.test('concurrent completions cannot exceed the target or double-credit the actor wallet',async()=>{
      const before=await balance('sub');
      const a=await taskBody(race.id),b=await taskBody(race.id);
      const results=await Promise.all([command(dom,a),command(sub,b)]);
      assert.equal(results.filter(x=>x.status<300).length,1);
      denied(results.find(x=>x.status>=400),'TASK_TARGET_REACHED');
      assert.equal(await balance('sub'),before+3); assert.equal((await progress(sub,race.id)).currentCount,1);
      const failed=results[0].status>=400?a:b;
      assert.equal((await rows('action_events',`command_id=eq.${failed.p_command_id}&select=id`)).length,0);
      assert.equal((await rows('action_command_receipts',`command_id=eq.${failed.p_command_id}&select=id`)).length,0);
    });

    await t.test('soft removal retains evidence and permits Undo; direct counter/history/balance and stale-period bypasses fail',async()=>{
      const complete=ok(await command(sub,await taskBody(deleted.id)));
      ok(await req('PATCH',`/rest/v1/tasks?id=eq.${deleted.id}`,dom.token,{deleted_at:new Date().toISOString()}));
      denied(await command(sub,await taskBody(deleted.id)),'TASK_DELETED');
      const undone=ok(await undo(dom,undoBody(complete.eventIds[0])));
      assert.equal(undone.taskProgress.deleted,true); assert.equal(undone.pointDeltas[0].amount,-4);
      assert.equal((await rows('action_events',`id=eq.${complete.eventIds[0]}&select=id`)).length,1);
      denied(await req('DELETE',`/rest/v1/tasks?id=eq.${deleted.id}`,sub.token),'TASK_SOFT_DELETE_REQUIRED');
      denied(await req('PATCH',`/rest/v1/tasks?id=eq.${daily.id}`,sub.token,{usage_data:[999,0,0,0,0,0,0]}),'ATOMIC_TASK_COMMAND_REQUIRED');
      denied(await rpc(sub,'record_task_completion',{task_id_param:daily.id,user_id_param:sub.id}),'ATOMIC_ACTION_COMMAND_REQUIRED');
      denied(await req('PATCH',`/rest/v1/profiles?id=eq.${sub.id}`,sub.token,{points:999}),'ATOMIC_BALANCE_COMMAND_REQUIRED');
      denied(await command(stranger,await taskBody(daily.id)),'STALE_RELATIONSHIP');
      denied(await command(sub,{...await taskBody(daily.id),p_expected_relationship_id:randomUUID()}),'STALE_RELATIONSHIP');
      denied(await rpc(sub,'_actions_task_progress',{p_period:period,p_task:daily.id,p_at:'2020-01-01T00:00:00Z'}));
      const before=hash(await rows('tasks',`relationship_id=eq.${period}&select=*`));
      await progress(sub,daily.id);
      assert.equal(hash(await rows('tasks',`relationship_id=eq.${period}&select=*`)),before,'Reading progress mutated task rows');
    });

    await t.test('a fresh relationship starts without old counts and rejects old Undo intents',async()=>{
      const previous=period;
      await setReady(dom,true);await setReady(sub,true);
      const solo=ok(await rpc(dom,'unlink_my_partner',{...scopeFor(period)}));fixturePeriods.add(solo.relationship_id);
      fixturePeriods.add((await identity(sub)).relationship_id);period=await link(dom,sub);
      denied(await undo(sub,undoBody(dailyReceipt.eventIds[0],{p_expected_relationship_id:previous})),'STALE_RELATIONSHIP');
      const fresh=await task(5,1);
      assert.equal((await rows('action_accounting_periods',`relationship_id=eq.${period}&select=accounting_enabled`))[0].accounting_enabled,true);
      assert.equal((await progress(sub,fresh.id)).currentCount,0);assert.equal(await balance('sub'),0);
      // An intentionally absent old target cannot produce new progress. Keep its
      // originally reviewed context on this explicit negative probe.
      denied(await command(sub,taskProbe(daily.id,{p_expected_context:dailyPayload.p_expected_context})),'TASK_NOT_FOUND');
      assert.equal((await rows('action_events',`relationship_id=eq.${previous}&select=id`,sub.token)).length,0);
    });
  } finally {
    const fixtureIds=accounts.map(a=>a.id);
    if(fixtureIds.length) for(const m of await rows('relationship_period_members',`user_id=in.(${fixtureIds.join(',')})&select=relationship_id`)) fixturePeriods.add(m.relationship_id);
    for(const id of fixturePeriods) {
      for(const table of ['action_feedback_acknowledgments','action_feedback_outbox','action_command_receipts','reward_usage','task_completion_history','action_inventory_movements','action_point_entries',
        'reward_inventory_lots','action_events','action_task_openings','action_wallets','action_accounting_periods','rewards','tasks']) {
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
});
