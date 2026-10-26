/** Real local Auth/PostgREST reward transactions. Parent must review/apply SQL first.
 * Never applies migrations, activates existing accounts, contacts production, or
 * publishes anything. Fixture-only activation/cleanup uses the local service key.
 * OBEDIENCE_LOCAL_STATUS_FILE=/absolute/private/status.private.json node --test tests/backend/rewards-api.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID, randomBytes, createHash } from 'node:crypto';

const statusFile = process.env.OBEDIENCE_LOCAL_STATUS_FILE;
test('atomic reward accounting on isolated local fixtures', {
  skip: statusFile ? false : 'Requires reviewed local reward migration; no database execution without explicit local runtime.',
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
    const email=`reward-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('base64url');
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
  const command = (a,payload) => rpc(a,'execute_reward_command',payload);
  const balance = async currency => (await rows('action_wallets',`relationship_id=eq.${period}&currency=eq.${currency}&select=balance`))[0].balance;
  const quantity = async reward => (await rows('reward_inventory_lots',`reward_id=eq.${reward.id}&status=eq.available&select=id`)).length;
  async function reward(owner,cost,supply=0,isDom=false) {
    const result=ok(await req('POST','/rest/v1/rewards',service,{title:'Synthetic accounting fixture',user_id:owner.id,
      relationship_id:period,cost,supply,is_dom_reward:isDom})); return result[0];
  }
  const activate = () => req('POST','/rest/v1/rpc/activate_action_accounting',service,{p_relationship_id:period});
  // Fail before fixture creation if migration is unavailable.
  await rows('action_accounting_periods','relationship_id=eq.00000000-0000-0000-0000-000000000000&select=relationship_id');
  const original = new Map();
  for(const table of protectedTables) original.set(table,await rows(table));
  let legacy,domReward,purchaseReward,mixed,giftReward,raceReward,task;
  let purchased,used,domPurchase;
  try {
    dom=await account('dom'); sub=await account('sub'); stranger=await account('sub');
    await setReady(dom,true); await setReady(sub,true); period=await link(dom,sub);
    await setReady(dom,false); await setReady(sub,false);
    domParticipant=(await identity(dom)).participant_id; subParticipant=(await identity(sub)).participant_id;
    ok(await rpc(dom,'set_my_timezone',{p_timezone:'America/Boise'}));
    ok(await rpc(sub,'set_my_timezone',{p_timezone:'America/Boise'}));
    ok(await req('PATCH',`/rest/v1/profiles?id=eq.${sub.id}`,service,{points:100,dom_points:17}));
    ok(await req('PATCH',`/rest/v1/profiles?id=eq.${dom.id}`,service,{points:19,dom_points:80}));
    legacy=await reward(sub,7,2); domReward=await reward(dom,11,1,true); purchaseReward=await reward(sub,13);
    mixed=await reward(sub,3); giftReward=await reward(sub,5); raceReward=await reward(sub,1);
    task=ok(await req('POST','/rest/v1/tasks',service,{title:'Synthetic accounting task',user_id:sub.id,relationship_id:period,points:5}))[0];

    await t.test('disabled staging preserves legacy writers; only service can activate verified current openings',async()=>{
      denied(await command(sub,body('reward_buy',purchaseReward.id)),'ACCOUNTING_NOT_ENABLED');
      ok(await rpc(sub,'record_task_completion',{task_id_param:task.id,user_id_param:sub.id}));
      const disposable=await account('sub');
      ok(await rpc(disposable,'delete_user_account'));
      accounts.splice(accounts.indexOf(disposable),1);
      ok(await req('PATCH',`/rest/v1/profiles?id=eq.${stranger.id}`,stranger.token,{points:9}));
      denied(await rpc(dom,'activate_action_accounting',{p_relationship_id:period}));
      denied(await req('PATCH',`/rest/v1/action_accounting_periods?relationship_id=eq.${period}`,dom.token,{accounting_enabled:true}));
      denied(await req('POST','/rest/v1/action_events',dom.token,{relationship_id:period}));
      const beforeProfiles=await rows('profiles',`id=in.(${dom.id},${sub.id})&select=*`);
      const beforeRewards=await rows('rewards',`relationship_id=eq.${period}&select=*`);
      ok(await activate());
      assert.equal(hash(await rows('profiles',`id=in.(${dom.id},${sub.id})&select=*`)),hash(beforeProfiles));
      assert.equal(hash(await rows('rewards',`relationship_id=eq.${period}&select=*`)),hash(beforeRewards));
      assert.equal((await identity(dom)).lifecycle_ready,false);
      assert.equal((await identity(sub)).lifecycle_ready,false);
      assert.equal(await balance('sub'),100); assert.equal(await balance('dom'),80);
      const lots=await rows('reward_inventory_lots',`relationship_id=eq.${period}&select=*`);
      assert.equal(lots.length,3);
      assert.ok(lots.every(l=>l.source==='legacy'&&l.paid_price===null&&l.valuation_id));
      assert.ok(lots.filter(l=>l.reward_id===legacy.id).every(l=>l.owner_participant_id===subParticipant&&l.refund_value===7));
      const state=(await rows('action_accounting_periods',`relationship_id=eq.${period}&select=*`))[0];
      assert.equal(state.source_snapshot.valuationBasis,'cutover_catalog_cost');
      assert.equal(state.source_snapshot.rewards.length,6);
      denied(await req('GET',`/rest/v1/action_accounting_periods?relationship_id=eq.${period}&select=source_snapshot`,sub.token));
      denied(await activate(),'ACCOUNTING_ALREADY_INITIALIZED');
    });

    await t.test('own-role buys are atomic and concurrent retries return exactly one durable receipt',async()=>{
      denied(await command(dom,body('reward_buy',purchaseReward.id)),'ACTION_NOT_ALLOWED');
      denied(await command(sub,body('reward_buy',domReward.id)),'ACTION_NOT_ALLOWED');
      const payload=body('reward_buy',purchaseReward.id);
      const results=await Promise.all([command(sub,payload),command(sub,payload)]);
      purchased=ok(results[0]); assert.deepEqual(ok(results[1]),purchased);
      assert.equal(await balance('sub'),87); assert.equal(await quantity(purchaseReward),1);
      assert.equal((await rows('action_command_receipts',`command_id=eq.${payload.p_command_id}&select=id`)).length,1);
      assert.equal((await rows('action_events',`command_id=eq.${payload.p_command_id}&select=id`)).length,1);
      denied(await command(sub,{...payload,p_reward_id:legacy.id}),'COMMAND_ID_REUSED');
      denied(await command(dom,payload),'COMMAND_ACTOR_MISMATCH');
      domPurchase=ok(await command(dom,body('reward_buy',domReward.id)));
      assert.equal(await balance('dom'),69);
      assert.ok(purchased.confirmedAt);
      assert.equal(purchased.availableRewardQuantities.find(x=>x.currency==='sub').quantity,1);
      denied(await command(stranger,payload),'STALE_RELATIONSHIP');
      assert.equal((await rows('action_events','select=id',stranger.token)).length,0);
      assert.equal((await rows('action_command_receipts',`command_id=eq.${payload.p_command_id}&select=id`,dom.token)).length,0);
    });

    await t.test('Use respects current permission, returns the selected owner, and Undo has an actionable purchase dependency',async()=>{
      used=ok(await command(dom,body('reward_redeem',purchaseReward.id,{p_inventory_currency:'sub'})));
      assert.equal(used.inventorySelection.allocatedCurrency,'sub');
      assert.equal(await quantity(purchaseReward),0);
      const event=(await rows('action_events',`id=eq.${used.eventIds[0]}&select=*`))[0];
      assert.equal(event.actor_participant_id,domParticipant); assert.equal(event.beneficiary_participant_id,subParticipant);
      assert.equal(event.calendar.timeZone,'America/Boise');
      const usage=(await rows('reward_usage',`action_event_id=eq.${used.eventIds[0]}&select=*`))[0];
      assert.equal(usage.user_id,sub.id); assert.match(usage.week_number,/^\d{4}-W\d{2}$/);
      const blocked=await command(sub,body('undo',purchased.eventIds[0]));
      denied(blocked,'UNDO_USE_FIRST'); assert.equal(JSON.parse(blocked.data.details).dependencyEventId,used.eventIds[0]);
      ok(await rpc(dom,'set_relationship_permissions',{p_expected_relationship_id:period,p_permissions:{sub_reward_redeem_undo:'sub'}}));
      denied(await command(dom,body('undo',used.eventIds[0])),'ACTION_NOT_ALLOWED');
      const undoUse=ok(await command(sub,body('undo',used.eventIds[0])));
      assert.equal(await quantity(purchaseReward),1); assert.equal(await balance('sub'),87);
      assert.equal((await rows('reward_usage',`action_event_id=eq.${used.eventIds[0]}&select=id`)).length,0);
      assert.equal((await rows('action_events',`id=eq.${used.eventIds[0]}&select=id`)).length,1);
      denied(await command(sub,body('undo',used.eventIds[0])),'ACTION_ALREADY_UNDONE');
      denied(await command(sub,body('undo',undoUse.eventIds[0])),'ACTION_NOT_REVERSIBLE');
      ok(await req('PATCH',`/rest/v1/rewards?id=eq.${purchaseReward.id}`,dom.token,{cost:99,is_dom_reward:true}));
      const refund=ok(await command(sub,body('undo',purchased.eventIds[0])));
      assert.deepEqual(refund.refunds,[{participantId:subParticipant,currency:'sub',paidPoints:13,migrationCredit:0,total:13}]);
      assert.equal(await balance('sub'),100); assert.equal(await balance('dom'),69);
      assert.equal(refund.feedback.find(x=>x.kind==='points_refunded').balanceAfter,100);
    });

    await t.test('type editing preserves two owned inventories and requires an explicit choice',async()=>{
      ok(await command(sub,body('reward_buy',mixed.id)));
      ok(await req('PATCH',`/rest/v1/rewards?id=eq.${mixed.id}`,dom.token,{is_dom_reward:true,cost:4}));
      ok(await command(dom,body('reward_buy',mixed.id)));
      denied(await command(dom,body('reward_redeem',mixed.id)),'INVENTORY_SELECTION_REQUIRED');
      denied(await command(sub,body('reward_redeem',mixed.id,{p_inventory_currency:'dom'})),'ACTION_NOT_ALLOWED');
      const selected=ok(await command(dom,body('reward_redeem',mixed.id,{p_inventory_currency:'sub'})));
      assert.equal(selected.availableRewardQuantities.find(x=>x.currency==='dom').quantity,1);
      assert.equal(selected.availableRewardQuantities.find(x=>x.currency==='sub').quantity,0);
      const active=(await rows('reward_inventory_lots',`active_redemption_event_id=eq.${selected.eventIds[0]}&select=*`))[0];
      assert.equal(active.currency,'sub'); assert.equal(active.owner_participant_id,subParticipant);
    });

    await t.test('gifts are Dom-to-Sub zero-cost acquisitions; zero refund removal has no coin refund notification',async()=>{
      denied(await command(sub,body('reward_gift',giftReward.id)),'ACTION_NOT_ALLOWED');
      denied(await command(dom,body('reward_gift',domReward.id)),'SUB_REWARD_GIFT_REQUIRED');
      const before=[await balance('sub'),await balance('dom')];
      const gift=ok(await command(dom,body('reward_gift',giftReward.id)));
      const lot=(await rows('reward_inventory_lots',`acquisition_event_id=eq.${gift.eventIds[0]}&select=*`))[0];
      assert.equal(lot.paid_price,0); assert.equal(lot.refund_value,0); assert.equal(lot.owner_participant_id,subParticipant);
      assert.deepEqual([await balance('sub'),await balance('dom')],before);
      const removed=ok(await command(dom,body('reward_delete',giftReward.id)));
      assert.equal(removed.feedback.some(x=>x.kind==='points_refunded'),false);
      assert.equal(removed.feedback.some(x=>x.kind==='action_confirmed'&&x.recipientParticipantId===subParticipant),true);
      assert.deepEqual([await balance('sub'),await balance('dom')],before);
    });

    await t.test('deletion refunds exact unused paid and frozen legacy values once, retaining used history',async()=>{
      // Legacy oldest unit is redeemed; one legacy plus a paid unit and gift remain.
      const redeemed=ok(await command(dom,body('reward_redeem',legacy.id,{p_inventory_currency:'sub'})));
      ok(await req('PATCH',`/rest/v1/rewards?id=eq.${legacy.id}`,dom.token,{cost:20}));
      const paid=ok(await command(sub,body('reward_buy',legacy.id)));
      ok(await command(dom,body('reward_gift',legacy.id)));
      const before=await balance('sub');
      const payload=body('reward_delete',legacy.id);
      const removed=ok(await command(dom,payload));
      assert.deepEqual(removed.refunds,[{participantId:subParticipant,currency:'sub',paidPoints:20,migrationCredit:7,total:27}]);
      assert.equal(await balance('sub'),before+27); assert.equal(await quantity(legacy),0);
      assert.deepEqual(ok(await command(dom,payload)),removed);
      assert.equal(await balance('sub'),before+27);
      assert.equal((await rows('action_feedback_outbox',`event_id=eq.${removed.eventIds[0]}&kind=eq.points_refunded&select=*`)).length,1);
      assert.ok((await rows('rewards',`id=eq.${legacy.id}&select=deleted_at`))[0].deleted_at);
      assert.equal((await rows('reward_usage',`action_event_id=eq.${redeemed.eventIds[0]}&select=id`)).length,1);
      denied(await command(sub,body('undo',paid.eventIds[0])),'LOT_ALREADY_CANCELLED');
      denied(await command(dom,body('reward_delete',legacy.id)),'REWARD_DELETED');
      const undone=ok(await command(sub,body('undo',redeemed.eventIds[0])));
      assert.equal(undone.refunds[0].migrationCredit,7); assert.equal(await balance('sub'),before+34);
      assert.equal(await quantity(legacy),0);
      const feedback=undone.feedback.find(x=>x.kind==='points_refunded');
      assert.equal(feedback.reason,'redemption_undone_after_deletion'); assert.equal(feedback.recipientParticipantId,subParticipant);
      assert.equal((await rows('action_events',`id=eq.${redeemed.eventIds[0]}&select=id`)).length,1);
    });

    await t.test('direct enabled-period writers are rejected; failed/concurrent purchases cannot partially spend',async()=>{
      denied(await req('PATCH',`/rest/v1/profiles?id=eq.${sub.id}`,sub.token,{points:999}),'ATOMIC_BALANCE_COMMAND_REQUIRED');
      denied(await req('PATCH',`/rest/v1/profiles?id=eq.${dom.id}`,sub.token,{dom_points:999}),'ATOMIC_BALANCE_COMMAND_REQUIRED');
      denied(await req('PATCH',`/rest/v1/rewards?id=eq.${mixed.id}`,dom.token,{supply:999}),'ATOMIC_REWARD_COMMAND_REQUIRED');
      denied(await req('DELETE',`/rest/v1/rewards?id=eq.${mixed.id}`,dom.token),'ATOMIC_REWARD_COMMAND_REQUIRED');
      denied(await req('POST','/rest/v1/reward_usage',sub.token,{reward_id:mixed.id,user_id:sub.id,used:true,week_number:'2026-W44',day_of_week:0}),'ATOMIC_REWARD_COMMAND_REQUIRED');
      denied(await req('PATCH',`/rest/v1/action_events?id=eq.${used.eventIds[0]}`,dom.token,{kind:'opening_balance'}));
      const historyBefore=await rows('task_completion_history',`task_id=eq.${task.id}&select=*`);
      denied(await rpc(sub,'record_task_completion',{task_id_param:task.id,user_id_param:sub.id}),'ATOMIC_ACTION_COMMAND_REQUIRED');
      denied(await req('POST','/rest/v1/task_completion_history',sub.token,{task_id:task.id,user_id:sub.id}),'ATOMIC_ACTION_COMMAND_REQUIRED');
      assert.equal(hash(await rows('task_completion_history',`task_id=eq.${task.id}&select=*`)),hash(historyBefore));
      denied(await rpc(sub,'delete_user_account'),'ACCOUNT_DELETION_INTEGRATION_REQUIRED');
      assert.equal((await identity(sub)).participant_id,subParticipant);
      denied(await command(sub,body('reward_buy',randomUUID())),'REWARD_NOT_FOUND');
      const before=await balance('sub'),cost=Math.floor(before/2)+1;
      ok(await req('PATCH',`/rest/v1/rewards?id=eq.${raceReward.id}`,dom.token,{cost}));
      const a=body('reward_buy',raceReward.id),b=body('reward_buy',raceReward.id);
      const results=await Promise.all([command(sub,a),command(sub,b)]);
      assert.equal(results.filter(r=>r.status<300).length,1);
      denied(results.find(r=>r.status>=400),'INSUFFICIENT_POINTS');
      const failed=results[0].status>=400?a:b;
      assert.equal((await rows('action_command_receipts',`command_id=eq.${failed.p_command_id}&select=id`)).length,0);
      assert.equal((await rows('action_events',`command_id=eq.${failed.p_command_id}&select=id`)).length,0);
      assert.equal(await balance('sub'),before-cost); assert.equal(await quantity(raceReward),1);
      const refunded=ok(await command(dom,body('undo',domPurchase.eventIds[0])));
      assert.equal(refunded.refunds[0].participantId,domParticipant); assert.equal(refunded.refunds[0].currency,'dom');
      assert.equal(refunded.refunds[0].total,11);
    });

    await t.test('same account UUIDs after a fresh relationship cannot replay an old period command or read its ledger',async()=>{
      const oldPeriod=period;
      await setReady(dom,true); await setReady(sub,true); // ONLY disposable fixtures.
      const solo=ok(await rpc(dom,'unlink_my_partner',{p_expected_relationship_id:period}));
      fixturePeriods.add(solo.relationship_id); fixturePeriods.add((await identity(sub)).relationship_id);
      period=await link(dom,sub); assert.notEqual(period,oldPeriod);
      denied(await command(sub,body('reward_buy',raceReward.id,{p_expected_relationship_id:oldPeriod})),'STALE_RELATIONSHIP');
      assert.equal((await rows('action_events',`relationship_id=eq.${oldPeriod}&select=id`,dom.token)).length,0);
      denied(await command(sub,body('reward_buy',raceReward.id)),'ACCOUNTING_NOT_ENABLED');
    });
  } finally {
    // Explicitly bounded fixture cleanup. Original rows are never targeted.
    const fixtureIds=accounts.map(a=>a.id);
    if(fixtureIds.length) for(const m of await rows('relationship_period_members',`user_id=in.(${fixtureIds.join(',')})&select=relationship_id`)) fixturePeriods.add(m.relationship_id);
    for(const id of fixturePeriods) {
      for(const table of ['action_feedback_outbox','action_command_receipts','reward_usage','action_inventory_movements','action_point_entries',
        'reward_inventory_lots','action_events','action_wallets','action_accounting_periods','rewards','task_completion_history','tasks']) {
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
