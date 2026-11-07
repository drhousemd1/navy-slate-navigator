/** PREPARED ONLY: requires parent-reviewed/applied 1300 on the pinned local runtime.
 * Never applies SQL, changes original accounts, activates delivery or invokes Edge.
 * Uses disposable fixtures, actual role Fresh/Resume and pair Fresh/unlink commands, plus service-seeded
 * historical evidence. Cleanup is restricted to verified fixture identities/periods.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID, randomBytes, createHash } from 'node:crypto';

const statusFile = process.env.OBEDIENCE_LOCAL_STATUS_FILE;
test('explicit solo role transitions preserve owned progress without conversion', {
  skip: statusFile ? false : 'Requires reviewed local 1300 and exclusive fixture runtime; no requests made.',
  timeout: 240_000,
}, async t => {
  assert.ok(statusFile.startsWith('/'));
  const status = JSON.parse(await readFile(statusFile, 'utf8'));
  assert.equal(status.runtime, 'native');
  assert.equal(status.env.API_URL, 'http://127.0.0.1:28622');
  assert.equal(new URL(status.env.DB_URL).hostname, '127.0.0.1');
  assert.equal(new URL(status.env.DB_URL).port, '20324');
  const api = status.env.API_URL, anon = status.env.ANON_KEY, service = status.env.SERVICE_ROLE_KEY;
  assert.ok(anon && service);
  const accounts = [], periods = new Set(), fixtureParticipants = new Set();
  const tables = ['admin_document_readers','app_guide_content','archived_messages','encyclopedia_entries','messages','profiles',
    'punishment_history','punishments','reward_usage','rewards','rule_violations','rules','task_completion_history','tasks',
    'user_color_schemes','user_notification_preferences','user_push_subscriptions','user_roles','wellbeing_snapshots','wellness_reminders',
    'identity_contexts','relationship_periods','relationship_period_members','partner_link_invitations','action_accounting_periods',
    'action_events','action_wallets','action_point_entries','reward_inventory_lots','action_inventory_movements','action_command_receipts',
    'action_feedback_outbox','action_feedback_acknowledgments','action_task_openings','runtime_probe','message_conversations',
    'message_attachments','message_legacy_sources','message_legacy_quarantine','message_media_configuration',
    'notification_configuration','notification_jobs','notification_deliveries','solo_role_change_receipts'];
  const canonical = x => Array.isArray(x) ? x.map(canonical) : x && typeof x === 'object'
    ? Object.fromEntries(Object.keys(x).sort().map(k => [k, canonical(x[k])])) : x;
  const hash = x => createHash('sha256').update(JSON.stringify(x.map(canonical).map(JSON.stringify).sort())).digest('hex');
  async function req(method, path, token = service, body) {
    assert.match(path, /^\/(auth|rest|storage)\/v1\//);
    const url = new URL(path, api); assert.equal(url.origin, api);
    const controller = new AbortController(); let timer;
    const deadline = new Promise((_, reject) => { timer = setTimeout(() => {
      controller.abort(); reject(new Error(`Local ${method} request exceeded 12000ms`));
    }, 12000); });
    try { return await Promise.race([deadline, (async () => {
      const response = await fetch(url, { method, headers: { apikey: token === service ? service : anon,
        Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal, redirect: 'error' });
      const text = await response.text(); let data; try { data = text ? JSON.parse(text) : null; } catch { data = null; }
      return { status: response.status, data };
    })()]); } finally { clearTimeout(timer); }
  }
  const ok = r => { assert.ok(r.status >= 200 && r.status < 300, `HTTP ${r.status}: ${r.data?.code ?? 'none'} ${r.data?.message ?? 'none'}`); return r.data; };
  const denied = (r, message) => { assert.ok(r.status >= 400, `Expected denial; received ${r.status}`); if (message) assert.equal(r.data?.message, message); };
  const rows = async (table, query = 'select=*', token = service) => ok(await req('GET', `/rest/v1/${table}?${query}`, token));
  async function allRows(table) { const result = []; for (let offset = 0;; offset += 500) {
    const page = await rows(table, `select=*&limit=500&offset=${offset}`); result.push(...page); if (page.length < 500) return result;
  } }
  async function authRows() { const result = []; for (let page = 1;; page++) {
    const users = ok(await req('GET', `/auth/v1/admin/users?page=${page}&per_page=100`)).users;
    result.push(...users); if (users.length < 100) return result;
  } }
  const rpc = (a, name, body = {}) => req('POST', `/rest/v1/rpc/${name}`, a?.token ?? anon, body);
  const scope = i => ({ p_expected_relationship_id: i.relationship_id, p_expected_relationship_session_id: i.relationship_session_id });
  // Fail before fixture creation if migration is absent. Anonymous access must be revoked.
  const anonymous = await rpc(null, 'get_my_role_change_options', { p_expected_relationship_id: randomUUID(), p_expected_relationship_session_id: randomUUID(), p_role: 'dom' });
  denied(anonymous); assert.equal(anonymous.data?.code, '42501');
  assert.match(anonymous.data?.message ?? '', /permission denied for function get_my_role_change_options/i);
  const originalAuth = await authRows(), originalAuthIds = new Set(originalAuth.map(x => x.id));
  const originalPeriods = new Set((await allRows('relationship_periods')).map(x => x.id));
  const originalParticipants = new Set((await allRows('relationship_period_members')).map(x => x.participant_id));
  const originalBuckets = hash(ok(await req('GET', '/storage/v1/bucket')));
  const originals = new Map(); for (const table of tables) originals.set(table, hash(await allRows(table)));
  assert.equal((await rows('identity_contexts', 'select=lifecycle_ready')).some(x => x.lifecycle_ready), false, 'Another lifecycle fixture is active');
  assert.equal((await rows('action_accounting_periods', 'select=accounting_enabled')).some(x => x.accounting_enabled), false, 'Another accounting fixture is active');
  assert.equal((await rows('notification_configuration', 'select=delivery_enabled')).some(x => x.delivery_enabled), false, 'Delivery must remain disabled');
  const digest = async () => { const value = {}; for (const table of tables) value[table] = hash(await allRows(table)); return value; };
  function ownedAccount(a) { assert.ok(accounts.some(x => x.id === a.id) && !originalAuthIds.has(a.id), 'Refusing non-fixture account'); }
  function trackPeriod(id) { assert.match(id, /^[0-9a-f-]{36}$/i); assert.ok(!originalPeriods.has(id), 'Refusing original period'); periods.add(id); return id; }
  async function ownedPeriod(id) {
    assert.ok(periods.has(id) && !originalPeriods.has(id), 'Refusing untracked period');
    const members = await rows('relationship_period_members', `relationship_id=eq.${id}&select=participant_id,user_id`);
    assert.ok(members.length, 'Refusing period without fixture membership');
    for (const member of members) {
      assert.ok(!originalParticipants.has(member.participant_id), 'Refusing original participant');
      assert.ok(member.user_id === null ? fixtureParticipants.has(member.participant_id) : accounts.some(a => a.id === member.user_id), 'Non-fixture member');
      fixtureParticipants.add(member.participant_id);
    }
  }
  async function identity(a) { ownedAccount(a); const i = ok(await rpc(a, 'get_my_identity'));
    if (i.relationship_id) trackPeriod(i.relationship_id);
    if (i.participant_id) { assert.ok(!originalParticipants.has(i.participant_id)); fixtureParticipants.add(i.participant_id); } return i;
  }
  async function account(role) {
    const email = `solo-role-${randomUUID()}@example.invalid`, password = randomBytes(24).toString('base64url');
    const user = ok(await req('POST', '/auth/v1/admin/users', service, { email, password, email_confirm: true, user_metadata: role ? { role } : {} }));
    assert.ok(user.id && !originalAuthIds.has(user.id) && !accounts.some(a => a.id === user.id));
    const a = { id: user.id, token: null }; accounts.push(a);
    a.token = ok(await req('POST', '/auth/v1/token?grant_type=password', anon, { email, password })).access_token;
    const i = await identity(a); if (i.role) ok(await rpc(a, 'set_my_timezone', { p_timezone: 'UTC' })); return a;
  }
  async function activate(a) { const i = await identity(a); await ownedPeriod(i.relationship_id);
    ok(await req('POST', '/rest/v1/rpc/activate_action_accounting', service, { p_relationship_id: i.relationship_id }));
    ok(await req('PATCH', `/rest/v1/identity_contexts?user_id=eq.${a.id}`, service, { lifecycle_ready: true }));
  }
  async function link(a, b, mode = 'fresh', previous = null) {
    const invite = ok(await rpc(a, 'generate_partner_link_code', { ...scope(await identity(a)), p_mode: mode, p_previous_relationship_id: previous }));
    const result = ok(await rpc(b, 'accept_partner_link_code', { ...scope(await identity(b)), p_code: invite.code, p_mode: mode, p_previous_relationship_id: previous }));
    trackPeriod(result.relationship_id); await identity(a); await identity(b); return result.relationship_id;
  }
  async function unlink(a) { ok(await rpc(a, 'unlink_my_partner', scope(await identity(a)))); for (const x of accounts) await identity(x); }
  async function insert(table, period, body) { await ownedPeriod(period);
    return ok(await req('POST', `/rest/v1/${table}`, service, { ...body, relationship_id: period }))[0];
  }
  const options = async (a, role) => ok(await rpc(a, 'get_my_role_change_options', { ...scope(await identity(a)), p_role: role }));
  const result = async (a, id) => ok(await rpc(a, 'get_my_role_change_result', { p_command_id: id }));
  function intent(o, mode, savedId = null) {
    return { p_command_id: randomUUID(), p_expected_relationship_id: o.scope.relationshipId,
      p_expected_relationship_session_id: o.scope.relationshipSessionId, p_role: o.role, p_mode: mode,
      p_saved_period_id: savedId, p_current_review_token: o.currentReviewToken,
      p_destination_review_token: savedId ? o.saved.find(s => s.periodId === savedId)?.reviewToken ?? null : null };
  }
  const change = (a, body) => rpc(a, 'change_my_role', body);
  const ledgerTables = ['action_accounting_periods','action_events','action_wallets','action_point_entries','reward_inventory_lots',
    'action_inventory_movements','action_command_receipts','action_feedback_outbox','action_feedback_acknowledgments','action_task_openings',
    'rewards','tasks','rules','punishments','reward_usage','task_completion_history','rule_violations','punishment_history'];
  async function ledger(p) { const value = {}; for (const table of ledgerTables) value[table] = hash(await rows(table, `relationship_id=eq.${p}&select=*`)); return value; }
  const balance = async p => (await rows('action_wallets', `relationship_id=eq.${p}&select=balance`))[0]?.balance;
  const lots = p => rows('reward_inventory_lots', `relationship_id=eq.${p}&select=*`);
  const rewardCommand = async (a, action, reward, extra = {}) => rpc(a, 'execute_reward_command', {
    ...scope(await identity(a)), p_command_id: randomUUID(), p_action: action, p_reward_id: reward.id, ...extra,
  });
  async function taskIntent(a, task) {
    const i = await identity(a), progress = ok(await rpc(a, 'get_task_progress', { p_expected_relationship_id: i.relationship_id, p_task_id: task.id }));
    assert.ok(progress.expectedContext);
    return { ...scope(i), p_command_id: randomUUID(), p_action: 'task_complete', p_task_id: task.id, p_expected_context: progress.expectedContext };
  }
  function assertOptions(o, a, role) {
    assert.deepEqual(Object.keys(o).sort(), ['current','currentReviewToken','role','saved','scope']);
    assert.equal(o.scope.accountId, a.id); assert.equal(o.role, role);
    assert.deepEqual(Object.keys(o.current).sort(), ['availableUses','balance','periodId','role']);
    assert.match(o.currentReviewToken, /^[a-f0-9]{64}$/);
    for (const s of o.saved) {
      assert.deepEqual(Object.keys(s).sort(), ['availableUses','balance','endedAt','periodId','reviewToken','role','startedAt']);
      assert.equal(s.role, role); assert.match(s.reviewToken, /^[a-f0-9]{64}$/);
    }
    for (const peer of accounts.filter(x => x.id !== a.id)) assert.equal(JSON.stringify(o).includes(peer.id), false, 'Other account ID leaked');
    for (const id of fixtureParticipants) assert.equal(JSON.stringify(o).includes(id), false, 'Participant ID leaked');
  }
  let main, peer, stranger, setup, originalSolo, firstDom, firstFresh, firstReceipt, sourceLedger, originalMember;
  let task, purchased, used, deleted, legacy, gifted, spender, availablePaidLot, giftLot, cancelledLot, oldQueue, oldInvite;
  let unchangedDates, sourceOpeningCount, savedDomLedger;
  try {
    main = await account('sub'); peer = await account('sub'); stranger = await account('dom'); setup = await account(null);
    await t.test('old initial setup and activation gates remain; options are checked read-only data', async () => {
      const made = ok(await rpc(setup, 'set_my_profile_role', { p_role: 'dominant' })); trackPeriod(made.relationship_id);
      assert.equal(made.role, 'dom'); assert.equal(made.lifecycle_ready, false);
      const i = await identity(main), before = await digest();
      denied(await rpc(main, 'get_my_role_change_options', { ...scope(i), p_role: 'dom' }), 'LIFECYCLE_INTEGRATION_REQUIRED');
      assert.deepEqual(await digest(), before);
      ownedAccount(main);
      ok(await req('PATCH', `/rest/v1/identity_contexts?user_id=eq.${main.id}`, service, { lifecycle_ready: true }));
      denied(await rpc(main, 'get_my_role_change_options', { ...scope(i), p_role: 'dom' }), 'LIFECYCLE_ACCOUNTING_INTEGRATION_REQUIRED');
      ok(await req('PATCH', `/rest/v1/identity_contexts?user_id=eq.${main.id}`, service, { lifecycle_ready: false }));
    });
    originalSolo = (await identity(main)).relationship_id;
    ok(await req('PATCH', `/rest/v1/profiles?id=eq.${main.id}`, service, { points: 50, dom_points: 777 }));
    legacy = await insert('rewards', originalSolo, { user_id: main.id, title: 'Imported uses', cost: 7, supply: 2, is_dom_reward: false });
    for (const a of [main,peer,stranger]) await activate(a);
    const initial = await identity(main); originalMember = initial.participant_id;
    denied(await rpc(main, 'set_my_profile_role', { p_role: 'dom' }), 'ROLE_LIFECYCLE_INTEGRATION_REQUIRED');
    purchased = await insert('rewards', originalSolo, { user_id: main.id, title: 'Paid unused', cost: 10, supply: 0, is_dom_reward: false });
    used = await insert('rewards', originalSolo, { user_id: main.id, title: 'Used reward', cost: 10, supply: 0, is_dom_reward: false });
    deleted = await insert('rewards', originalSolo, { user_id: main.id, title: 'Removed reward', cost: 20, supply: 0, is_dom_reward: false });
    gifted = await insert('rewards', originalSolo, { user_id: main.id, title: 'Saved gift', cost: 8, supply: 1, is_dom_reward: false });
    spender = await insert('rewards', originalSolo, { user_id: main.id, title: 'Spend before correction', cost: 35, supply: 0, is_dom_reward: false });
    task = await insert('tasks', originalSolo, { user_id: main.id, title: 'Corrected task', is_dom_task: false, points: 5, frequency: 'daily', frequency_count: 3 });
    ok(await rewardCommand(main, 'reward_buy', purchased, { p_expected_cost: 10 }));
    ok(await rewardCommand(main, 'reward_buy', used, { p_expected_cost: 10 }));
    ok(await rewardCommand(main, 'reward_redeem', used, { p_inventory_currency: 'sub' }));
    ok(await rewardCommand(main, 'reward_buy', deleted, { p_expected_cost: 20 }));
    ok(await rewardCommand(main, 'reward_delete', deleted));
    // A saved gift is seeded as historical evidence, not a claim that a solo Sub
    // can invoke the Dom-only gifting command. The transition must preserve it.
    const giftEvent = await insert('action_events', originalSolo, { kind: 'reward_gifted', reward_id: gifted.id,
      beneficiary_participant_id: originalMember, subject: { title: gifted.title, role: 'sub' }, provenance: 'legacy_import' });
    giftLot = await insert('reward_inventory_lots', originalSolo, { reward_id: gifted.id, owner_participant_id: originalMember,
      currency: 'sub', status: 'available', acquisition_event_id: giftEvent.id, source: 'gift', paid_price: 0, refund_value: 0 });
    const taskReceipt = ok(await rpc(main, 'execute_task_command', await taskIntent(main, task)));
    assert.equal(await balance(originalSolo), 35);
    ok(await rewardCommand(main, 'reward_buy', spender, { p_expected_cost: 35 }));
    ok(await rpc(main, 'undo_action', { ...scope(await identity(main)), p_command_id: randomUUID(), p_event_id: taskReceipt.eventIds[0] }));
    assert.equal(await balance(originalSolo), -5);
    const sourceLots = await lots(originalSolo);
    availablePaidLot = sourceLots.find(l => l.reward_id === purchased.id && l.status === 'available');
    cancelledLot = sourceLots.find(l => l.reward_id === deleted.id && l.status === 'cancelled');
    assert.ok(availablePaidLot && cancelledLot && sourceLots.some(l => l.source === 'legacy') && sourceLots.some(l => l.status === 'redeemed'));
    oldQueue = { ...scope(await identity(main)), p_command_id: randomUUID(), p_action: 'reward_buy', p_reward_id: purchased.id, p_expected_cost: 10 };
    oldInvite = ok(await rpc(main, 'generate_partner_link_code', { ...scope(await identity(main)), p_mode: 'fresh', p_previous_relationship_id: null }));
    sourceLedger = await ledger(originalSolo);
    unchangedDates = hash(await rows('action_events', `relationship_id=eq.${originalSolo}&select=id,recorded_at,calendar,reverses_event_id`));
    sourceOpeningCount = (await rows('action_events', `relationship_id=eq.${originalSolo}&kind=eq.opening_balance&select=id`)).length;

    await t.test('exact review includes signed balance and available inventory; malformed choices cannot mutate', async () => {
      const o = await options(main, 'dom'); assertOptions(o, main, 'dom');
      assert.equal(o.current.balance, -5); assert.equal(o.current.availableUses, 5); assert.deepEqual(o.saved, []);
      assert.deepEqual(await options(main, 'dom'), o);
      const before = await digest();
      const base = intent(o, 'fresh');
      for (const mode of [null,'automatic','continue']) denied(await change(main, { ...base, p_mode: mode }), 'INVALID_ROLE_TRANSITION_MODE');
      denied(await change(main, { ...base, p_command_id: null }), 'COMMAND_ID_REQUIRED');
      denied(await change(main, { ...base, p_mode: 'resume' }), 'INVALID_ROLE_TRANSITION_MODE');
      denied(await change(main, { ...base, p_role: 'sub' }), 'ROLE_CHANGE_NOT_REQUIRED');
      denied(await change(main, { ...base, p_saved_period_id: originalSolo }), 'INVALID_ROLE_TRANSITION_MODE');
      denied(await change(main, { ...base, p_destination_review_token: 'unused' }), 'INVALID_ROLE_TRANSITION_MODE');
      denied(await change(main, { ...base, p_current_review_token: null }), 'ROLE_REVIEW_CHANGED');
      denied(await change(main, { ...base, p_role: 'admin' }), 'INVALID_PROFILE_ROLE');
      denied(await change(main, { ...base, p_expected_relationship_session_id: randomUUID() }), 'STALE_RELATIONSHIP_SESSION');
      denied(await change(peer, base), 'STALE_RELATIONSHIP');
      denied(await rpc(main, '_solo_role_summary', { p_actor: main.id, p_period: originalSolo, p_role: 'sub', p_status: 'active' }));
      denied(await req('GET', '/rest/v1/solo_role_change_receipts?select=*', main.token));
      assert.deepEqual(await result(peer, base.p_command_id), { receipt: null });
      assert.deepEqual(await digest(), before);
    });
    await t.test('current balance changes invalidate the reviewed request instead of switching with new values', async () => {
      const before = await options(main, 'dom'), request = intent(before, 'fresh');
      ok(await req('PATCH', `/rest/v1/action_wallets?relationship_id=eq.${originalSolo}`, service, { balance: -4 }));
      try {
        assert.notEqual((await options(main, 'dom')).currentReviewToken, before.currentReviewToken);
        denied(await change(main, request), 'ROLE_REVIEW_CHANGED');
        assert.equal((await identity(main)).relationship_id, originalSolo);
      } finally { ok(await req('PATCH', `/rest/v1/action_wallets?relationship_id=eq.${originalSolo}`, service, { balance: -5 })); }
      assert.deepEqual(await ledger(originalSolo), sourceLedger);
    });
    await t.test('concurrent identical Fresh requests create one zero wallet, preserve all old evidence and invalidate stale intent', async () => {
      firstFresh = intent(await options(main, 'dom'), 'fresh');
      const beforePeriods = (await allRows('relationship_periods')).length;
      const responses = await Promise.all([change(main, firstFresh), change(main, firstFresh)]);
      firstReceipt = ok(responses[0]); assert.deepEqual(ok(responses[1]), firstReceipt);
      firstDom = trackPeriod(firstReceipt.to.periodId); await identity(main);
      assert.equal((await allRows('relationship_periods')).length, beforePeriods + 1);
      assert.equal((await rows('solo_role_change_receipts', `actor_user_id=eq.${main.id}&command_id=eq.${firstFresh.p_command_id}&select=*`)).length, 1);
      assert.equal(firstReceipt.from.periodId, originalSolo); assert.equal(firstReceipt.to.role, 'dom');
      assert.equal(await balance(firstDom), 0, 'Unused profile dom_points was imported');
      assert.equal((await options(main, 'sub')).current.availableUses, 0);
      for (const table of ['tasks','rewards','rules','punishments','reward_inventory_lots']) assert.equal((await rows(table, `relationship_id=eq.${firstDom}&select=id`)).length, 0);
      assert.equal((await rows('action_events', `relationship_id=eq.${firstDom}&kind=eq.opening_balance&select=id`)).length, 1);
      assert.deepEqual(await ledger(originalSolo), sourceLedger);
      assert.equal((await rows('relationship_period_members', `participant_id=eq.${originalMember}&select=role`))[0].role, 'sub');
      denied(await rpc(main, 'execute_reward_command', oldQueue), 'STALE_RELATIONSHIP');
      denied(await rpc(stranger, 'preview_partner_link_code', { p_code: oldInvite.code }), 'INVALID_LINK_CODE');
      assert.deepEqual(await result(main, firstFresh.p_command_id), { receipt: firstReceipt });
      assert.deepEqual(await result(peer, firstFresh.p_command_id), { receipt: null });
      denied(await change(main, { ...firstFresh, p_role: 'sub' }), 'ROLE_TRANSITION_ID_REUSED');
      savedDomLedger = await ledger(firstDom);
    });
    await t.test('same-count inventory substitution changes destination review and cannot silently resume', async () => {
      const o = await options(main, 'sub'), selected = o.saved.find(x => x.periodId === originalSolo);
      assert.equal(selected.balance, -5); assert.equal(selected.availableUses, 5);
      const request = intent(o, 'resume', originalSolo);
      await ownedPeriod(originalSolo);
      ok(await req('PATCH', `/rest/v1/reward_inventory_lots?id=eq.${giftLot.id}`, service, { status: 'cancelled' }));
      ok(await req('PATCH', `/rest/v1/reward_inventory_lots?id=eq.${cancelledLot.id}`, service, { status: 'available' }));
      try {
        const changed = (await options(main, 'sub')).saved.find(x => x.periodId === originalSolo);
        assert.equal(changed.availableUses, selected.availableUses); assert.equal(changed.balance, selected.balance);
        assert.notEqual(changed.reviewToken, selected.reviewToken);
        denied(await change(main, request), 'ROLE_REVIEW_CHANGED');
        assert.equal((await identity(main)).relationship_id, firstDom);
      } finally {
        ok(await req('PATCH', `/rest/v1/reward_inventory_lots?id=eq.${giftLot.id}`, service, { status: 'available' }));
        ok(await req('PATCH', `/rest/v1/reward_inventory_lots?id=eq.${cancelledLot.id}`, service, { status: 'cancelled' }));
      }
      assert.deepEqual(await ledger(originalSolo), sourceLedger);
    });
    await t.test('Resume restores the exact saved member, debt, lots and corrections without another opening', async () => {
      const o = await options(main, 'sub'), r = ok(await change(main, intent(o, 'resume', originalSolo)));
      const i = await identity(main); assert.equal(i.relationship_id, originalSolo); assert.equal(i.participant_id, originalMember);
      assert.equal(i.role, 'sub'); assert.notEqual(i.relationship_session_id, firstReceipt.from.sessionId);
      assert.equal(r.to.sessionId, i.relationship_session_id);
      assert.equal(await balance(originalSolo), -5); assert.deepEqual(await ledger(originalSolo), sourceLedger);
      assert.deepEqual(await ledger(firstDom), savedDomLedger);
      assert.equal(hash(await rows('action_events', `relationship_id=eq.${originalSolo}&select=id,recorded_at,calendar,reverses_event_id`)), unchangedDates);
      assert.equal((await rows('action_events', `relationship_id=eq.${originalSolo}&kind=eq.opening_balance&select=id`)).length, sourceOpeningCount);
      assert.equal((await rows('rewards', `id=eq.${deleted.id}&select=deleted_at`))[0].deleted_at !== null, true);
      denied(await rpc(main, 'execute_reward_command', oldQueue), 'STALE_RELATIONSHIP_SESSION');
      const before = await digest();
      assert.deepEqual(ok(await change(main, firstFresh)), firstReceipt, 'Exact prior receipt is recoverable after another transition');
      assert.deepEqual(await result(main, firstFresh.p_command_id), { receipt: firstReceipt });
      assert.equal((await identity(main)).relationship_id, originalSolo, 'Replay restored its old destination');
      assert.deepEqual(await digest(), before);
    });
    await t.test('foreign, wrong-role, uninitialized and linked destinations do not widen access', async () => {
      const o = await options(main, 'dom'); assertOptions(o, main, 'dom');
      const blank = ok(await req('POST', '/rest/v1/relationship_periods', service, { status: 'archived', ended_at: new Date().toISOString() }))[0];
      trackPeriod(blank.id);
      const member = ok(await req('POST', '/rest/v1/relationship_period_members', service, { relationship_id: blank.id, user_id: main.id, role: 'dom' }))[0];
      fixtureParticipants.add(member.participant_id);
      assert.equal((await options(main, 'dom')).saved.some(x => x.periodId === blank.id), false);
      const base = intent(await options(main, 'dom'), 'resume', firstDom);
      for (const id of [blank.id, (await identity(stranger)).relationship_id, originalSolo, randomUUID()])
        denied(await change(main, { ...base, p_saved_period_id: id }), 'ROLE_SAVED_PERIOD_UNAVAILABLE');
      denied(await change(main, { ...base, p_role: 'sub' }), 'ROLE_SAVED_PERIOD_UNAVAILABLE');
      // Incoming malformed link is a blocker, not implicit permission to repair it.
      ownedAccount(stranger);
      ok(await req('PATCH', `/rest/v1/profiles?id=eq.${stranger.id}`, service, { linked_partner_id: main.id }));
      try { denied(await rpc(main, 'get_my_role_change_options', { ...scope(await identity(main)), p_role: 'dom' }), 'VALID_IDENTITY_REQUIRED'); }
      finally { ok(await req('PATCH', `/rest/v1/profiles?id=eq.${stranger.id}`, service, { linked_partner_id: null })); }
      const resumed = ok(await change(main, intent(await options(main, 'dom'), 'resume', firstDom))); assert.equal(resumed.to.periodId, firstDom);
      await identity(main);
      const pair = await link(main, peer);
      denied(await rpc(main, 'get_my_role_change_options', { ...scope(await identity(main)), p_role: 'sub' }), 'UNLINK_BEFORE_ROLE_CHANGE');
      await unlink(main);
      const later = await options(main, 'sub'); assertOptions(later, main, 'sub');
      assert.equal(later.saved.some(x => x.periodId === pair), false);
      denied(await change(main, { ...intent(later, 'resume', originalSolo), p_saved_period_id: pair }), 'ROLE_SAVED_PERIOD_UNAVAILABLE');
      assert.equal(later.current.role, 'dom'); assert.equal(later.current.balance, 0);
      assert.ok(later.saved.some(x => x.periodId === originalSolo), 'Older solo progress became inaccessible across Fresh pair boundary');
      const chosen = ok(await change(main, intent(later, 'resume', originalSolo)));
      assert.equal(chosen.to.periodId, originalSolo); await identity(main);
      assert.equal(await balance(originalSolo), -5); assert.deepEqual(await ledger(originalSolo), sourceLedger);
    });
    await t.test('current-role Resume is explicit; distinct racing Fresh requests cannot create two transitions', async () => {
      const domOptions = await options(main, 'dom');
      const a = intent(domOptions, 'fresh'), b = intent(domOptions, 'fresh');
      const before = (await allRows('relationship_periods')).length;
      const attempts = await Promise.all([change(main, a), change(main, b)]);
      assert.equal(attempts.filter(x => x.status < 300).length, 1);
      const won = ok(attempts.find(x => x.status < 300)); trackPeriod(won.to.periodId); await identity(main);
      denied(attempts.find(x => x.status >= 400), 'STALE_RELATIONSHIP');
      assert.equal((await allRows('relationship_periods')).length, before + 1);
      const ownRole = await options(main, 'dom'); assert.ok(ownRole.saved.some(x => x.periodId === firstDom));
      denied(await change(main, intent(ownRole, 'fresh')), 'ROLE_CHANGE_NOT_REQUIRED');
      const selected = ok(await change(main, intent(ownRole, 'resume', firstDom)));
      assert.equal(selected.to.role, 'dom'); assert.equal(selected.to.periodId, firstDom); await identity(main);
      assert.deepEqual(await ledger(firstDom), savedDomLedger); assert.deepEqual(await ledger(originalSolo), sourceLedger);
    });
    await t.test('result and options do not mutate or expose another actor receipt; direct role/receipt writes stay denied', async () => {
      const before = await digest(), i = await identity(main), o = await options(main, 'sub'); assertOptions(o, main, 'sub');
      assert.deepEqual(await result(main, randomUUID()), { receipt: null });
      assert.deepEqual(await result(peer, firstFresh.p_command_id), { receipt: null });
      denied(await rpc(null, 'get_my_role_change_result', { p_command_id: firstFresh.p_command_id }));
      denied(await req('POST', '/rest/v1/solo_role_change_receipts', main.token, { actor_user_id: main.id, command_id: randomUUID(), intent: {}, receipt: {}, completed_at: new Date().toISOString() }));
      denied(await req('PATCH', `/rest/v1/profiles?id=eq.${main.id}`, main.token, { role: 'sub' }));
      denied(await rpc(main, 'set_my_profile_role', { p_role: 'sub' }), 'ROLE_LIFECYCLE_INTEGRATION_REQUIRED');
      denied(await rpc(main, 'delete_user_account'), 'ACCOUNT_DELETION_INTEGRATION_REQUIRED');
      assert.deepEqual(await digest(), before); assert.equal((await identity(main)).relationship_id, i.relationship_id);
    });
  } finally {
    for (const a of accounts) await identity(a);
    for (const p of periods) await ownedPeriod(p);
    // Actor-owned receipts have no survivor retention; remove before fixture
    // Auth/period cleanup. This does not claim the real deletion flow is enabled.
    for (const a of accounts) { ownedAccount(a); ok(await req('DELETE', `/rest/v1/solo_role_change_receipts?actor_user_id=eq.${a.id}`, service)); }
    for (const table of ['notification_jobs','action_feedback_acknowledgments','action_feedback_outbox','action_command_receipts',
      'reward_usage','task_completion_history','rule_violations','punishment_history','action_inventory_movements','action_point_entries',
      'reward_inventory_lots','action_events','action_task_openings','action_wallets','action_accounting_periods','rewards','tasks','rules','punishments'])
      for (const p of periods) ok(await req('DELETE', `/rest/v1/${table}?relationship_id=eq.${p}`, service));
    for (const a of accounts) ok(await req('PATCH', `/rest/v1/profiles?id=eq.${a.id}`, service, { linked_partner_id: null }));
    for (const a of accounts) ok(await req('DELETE', `/auth/v1/admin/users/${a.id}`, service));
    for (const p of periods) {
      ok(await req('DELETE', `/rest/v1/relationship_period_members?relationship_id=eq.${p}`, service));
      ok(await req('DELETE', `/rest/v1/relationship_periods?id=eq.${p}`, service));
    }
    for (const table of tables) assert.equal(hash(await allRows(table)), originals.get(table), `Original ${table} changed`);
    assert.equal(hash(await authRows()), hash(originalAuth), 'Original Auth records changed');
    assert.equal(hash(ok(await req('GET', '/storage/v1/bucket'))), originalBuckets, 'Original Storage buckets changed');
  }
});
