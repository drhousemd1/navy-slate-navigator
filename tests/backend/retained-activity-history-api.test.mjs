/** PREPARED ONLY: requires parent-reviewed/applied 1200 on the pinned local runtime.
 * Never applies SQL, changes original accounts, activates delivery or invokes Edge.
 * Uses disposable fixtures, actual Fresh/Continue/unlink commands and service-seeded
 * historical evidence. Cleanup is restricted to verified fixture identities/periods.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID, randomBytes, createHash } from 'node:crypto';

const statusFile = process.env.OBEDIENCE_LOCAL_STATUS_FILE;
test('retained shared activity is masked, paginated and bound to original membership', {
  skip: statusFile ? false : 'Requires reviewed local 1200 and exclusive fixture runtime; no requests made.',
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
  const accounts = [], periods = new Set(), fixtureParticipants = new Set(), unscopedRows = [];
  const tables = ['admin_document_readers','app_guide_content','archived_messages','encyclopedia_entries','messages','profiles',
    'punishment_history','punishments','reward_usage','rewards','rule_violations','rules','task_completion_history','tasks',
    'user_color_schemes','user_notification_preferences','user_push_subscriptions','user_roles','wellbeing_snapshots','wellness_reminders',
    'identity_contexts','relationship_periods','relationship_period_members','partner_link_invitations','action_accounting_periods',
    'action_events','action_wallets','action_point_entries','reward_inventory_lots','action_inventory_movements','action_command_receipts',
    'action_feedback_outbox','action_feedback_acknowledgments','action_task_openings','runtime_probe','message_conversations',
    'message_attachments','message_legacy_sources','message_legacy_quarantine','message_media_configuration',
    'notification_configuration','notification_jobs','notification_deliveries'];
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
  const anonymous = await rpc(null, 'list_my_retained_activity_periods', { p_expected_relationship_id: randomUUID(), p_expected_relationship_session_id: randomUUID() });
  denied(anonymous); assert.equal(anonymous.data?.code, '42501');
  assert.match(anonymous.data?.message ?? '', /permission denied for function list_my_retained_activity_periods/i);
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
    const email = `retained-activity-${randomUUID()}@example.invalid`, password = randomBytes(24).toString('base64url');
    const user = ok(await req('POST', '/auth/v1/admin/users', service, { email, password, email_confirm: true, user_metadata: { role } }));
    assert.ok(user.id && !originalAuthIds.has(user.id) && !accounts.some(a => a.id === user.id));
    const a = { id: user.id, token: null }; accounts.push(a);
    a.token = ok(await req('POST', '/auth/v1/token?grant_type=password', anon, { email, password })).access_token;
    await identity(a); ok(await rpc(a, 'set_my_timezone', { p_timezone: 'UTC' })); return a;
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
  const list = async a => ok(await rpc(a, 'list_my_retained_activity_periods', scope(await identity(a))));
  const page = async (a, p, domain, extra = {}) => ok(await rpc(a, 'get_my_retained_activity_history', {
    ...scope(await identity(a)), p_retained_relationship_id: p, p_domain: domain, ...extra,
  }));
  const wireRowKeys = ['key','source','kind','timestamp','title','role','actor','beneficiary','calendar','pointEffects','reversesKey','provenance','legacy'].sort();
  function privacy(result) {
    const text = JSON.stringify(result);
    for (const a of accounts) assert.equal(text.includes(a.id), false, 'Auth ID leaked');
    for (const id of fixtureParticipants) assert.equal(text.includes(id), false, 'Participant ID leaked');
    assert.equal(text.includes('PRIVATE_FIXTURE_SENTINEL'), false, 'Raw private payload leaked');
    assert.deepEqual(Object.keys(result).sort(), ['nextCursor','rows','scope']);
    for (const row of result.rows) {
      assert.deepEqual(Object.keys(row).sort(), wireRowKeys);
      assert.deepEqual(Object.keys(row.title).sort(), ['basis','text']);
      for (const calendar of [row.calendar, ...(row.pointEffects ?? []).map(x => x.calendar)].filter(Boolean))
        assert.deepEqual(Object.keys(calendar).sort(), ['localDate','timeZone','weekStartDate']);
      for (const point of row.pointEffects ?? []) assert.deepEqual(Object.keys(point).sort(), ['amount','calendar','currency','person']);
    }
  }
  let dom, sub, newSub, stranger, pair, earlierSolo, soloHistory, domMember, subMember, task, domTask, reward, rule, punishment;
  const eventIds = [], legacyIds = {}, at = '2026-10-20T12:00:00.000Z';
  const calendar = { localDate: '2026-10-20', weekStartDate: '2026-10-19', timeZone: 'UTC' };
  let rewardEvent, ruleEvent, missingTitleEvent, punishmentEvent, reversal, openingInventory, initialSession;
  try {
    dom = await account('dom'); sub = await account('sub'); newSub = await account('sub'); stranger = await account('dom');
    await t.test('reads do not enable staged accounts or mutate any table', async () => {
      const before = await digest(), i = await identity(dom), result = await list(dom);
      assert.deepEqual(result, { scope: { currentPeriodId: i.relationship_id, currentSessionId: i.relationship_session_id }, periods: [] });
      assert.deepEqual(await digest(), before);
      denied(await rpc(dom, 'list_my_retained_activity_periods', { ...scope(i), p_expected_relationship_session_id: null }), 'STALE_RELATIONSHIP_SESSION');
      denied(await rpc(dom, 'list_my_retained_activity_periods', scope(await identity(sub))), 'STALE_RELATIONSHIP');
    });
    for (const a of accounts) await activate(a);
    earlierSolo = (await identity(dom)).relationship_id;
    const soloTask = await insert('tasks', earlierSolo, { title: 'Earlier solo task', user_id: dom.id, is_dom_task: true });
    soloHistory = await insert('task_completion_history', earlierSolo, { task_id: soloTask.id, user_id: dom.id, completed_at: at });
    pair = await link(dom, sub);
    const di = await identity(dom), si = await identity(sub); domMember = di.participant_id; subMember = si.participant_id; initialSession = di.relationship_session_id;
    task = await insert('tasks', pair, { title: 'Current Sub task title', user_id: dom.id, is_dom_task: false, points: 2 });
    domTask = await insert('tasks', pair, { title: 'Current Dom task title', user_id: sub.id, is_dom_task: true, points: 2 });
    reward = await insert('rewards', pair, { title: 'Current reward title', user_id: dom.id, is_dom_reward: false, cost: 0 });
    rule = await insert('rules', pair, { title: 'Current rule title', user_id: dom.id });
    punishment = await insert('punishments', pair, { title: 'Current punishment title', user_id: dom.id, points: 0, dom_points: 5 });
    const foreignPeriod = (await identity(stranger)).relationship_id;
    const foreignReward = await insert('rewards', foreignPeriod, { title: 'PRIVATE_FIXTURE_SENTINEL foreign title', user_id: stranger.id });
    async function event(kind, subjectType, definition, actor, beneficiary, role, extra = {}) {
      return insert('action_events', pair, { kind, [`${subjectType}_id`]: definition.id, actor_participant_id: actor,
        beneficiary_participant_id: beneficiary, recorded_at: at, provenance: 'command',
        subject: { type: subjectType, title: `Recorded ${subjectType} title`, role, id: dom.id, raw: 'PRIVATE_FIXTURE_SENTINEL' },
        calendar: { ...calendar, participantId: subMember, private: 'PRIVATE_FIXTURE_SENTINEL' },
        intent: { raw: 'PRIVATE_FIXTURE_SENTINEL' }, definition_values: { raw: 'PRIVATE_FIXTURE_SENTINEL' }, ...extra });
    }
    for (const [actor, beneficiary, role, definition] of [[domMember,domMember,'dom',domTask], [domMember,subMember,'sub',task],
      [subMember,domMember,'dom',domTask], [subMember,subMember,'sub',task]]) {
      const e = await event('task_completed', 'task', definition, actor, beneficiary, role); eventIds.push(e.id);
      await insert('action_point_entries', pair, { event_id: e.id, participant_id: beneficiary, currency: role, amount: 2, reason: 'task_award', calendar: null });
    }
    reversal = await event('action_undone', 'task', domTask, subMember, domMember, 'dom', { reverses_event_id: eventIds[0] });
    await insert('action_point_entries', pair, { event_id: reversal.id, participant_id: domMember, currency: 'dom', amount: -2, reason: 'task_undo' });
    rewardEvent = await event('reward_purchased', 'reward', reward, subMember, subMember, 'sub');
    await insert('action_point_entries', pair, { event_id: rewardEvent.id, participant_id: subMember, currency: 'sub', amount: 0, reason: 'purchase' });
    ruleEvent = await event('rule_violated', 'rule', rule, domMember, subMember, 'sub');
    missingTitleEvent = await event('rule_violated', 'rule', rule, domMember, subMember, 'sub', { subject: { role: 'sub', raw: 'PRIVATE_FIXTURE_SENTINEL' } });
    punishmentEvent = await event('punishment_applied', 'punishment', punishment, domMember, subMember, 'sub');
    await insert('action_point_entries', pair, { event_id: punishmentEvent.id, participant_id: subMember, currency: 'sub', amount: 0, reason: 'punishment_deduction', calendar: null });
    await insert('action_point_entries', pair, { event_id: punishmentEvent.id, participant_id: domMember, currency: 'dom', amount: 5, reason: 'punishment_award',
      calendar: { localDate: '2026-10-19', weekStartDate: '2026-10-19', timeZone: 'Pacific/Honolulu', participantId: domMember } });
    openingInventory = await event('opening_inventory', 'reward', reward, null, subMember, 'sub', { provenance: 'legacy_import', calendar: null });
    const legacy = async (table, body, mapped = true) => {
      const id = randomUUID(); if (!mapped) unscopedRows.push({ table, id });
      return ok(await req('POST', `/rest/v1/${table}`, service, { id, user_id: dom.id, relationship_id: mapped ? pair : null, ...body }))[0];
    };
    legacyIds.task = (await legacy('task_completion_history', { task_id: task.id, completed_at: at })).id;
    await legacy('task_completion_history', { task_id: domTask.id, completed_at: at, user_id: sub.id });
    await legacy('task_completion_history', { task_id: domTask.id, completed_at: at, action_event_id: eventIds[0] });
    legacyIds.rewardFalse = (await legacy('reward_usage', { reward_id: reward.id, created_at: at, used: false, day_of_week: 0, week_number: 'legacy-week' })).id;
    legacyIds.rewardNull = (await legacy('reward_usage', { reward_id: null, created_at: null, used: null, day_of_week: 6, week_number: 'unknown-week' })).id;
    legacyIds.rewardForeign = (await legacy('reward_usage', { reward_id: foreignReward.id, created_at: null, used: true, day_of_week: 4, week_number: 'legacy-week' })).id;
    await legacy('reward_usage', { reward_id: reward.id, created_at: at, used: true, day_of_week: 0, week_number: 'legacy-week', action_event_id: rewardEvent.id });
    legacyIds.rule = (await legacy('rule_violations', { rule_id: rule.id, violation_date: at, day_of_week: 6, week_number: 'historical-format' })).id;
    await legacy('rule_violations', { rule_id: rule.id, violation_date: at, day_of_week: 6, week_number: 'historical-format', action_event_id: ruleEvent.id });
    legacyIds.punishment = (await legacy('punishment_history', { punishment_id: punishment.id, applied_date: null, day_of_week: 0, points_deducted: 0 })).id;
    await legacy('punishment_history', { punishment_id: null, applied_date: at, day_of_week: 6, points_deducted: 99, user_id: sub.id });
    await legacy('punishment_history', { punishment_id: punishment.id, applied_date: at, day_of_week: 0, points_deducted: 0, action_event_id: punishmentEvent.id });
    await legacy('task_completion_history', { task_id: task.id, completed_at: at }, false);
    await legacy('reward_usage', { reward_id: reward.id, created_at: null, used: null, day_of_week: 0, week_number: 'unmapped' }, false);
    await legacy('rule_violations', { rule_id: rule.id, violation_date: at, day_of_week: 0, week_number: 'unmapped' }, false);
    await legacy('punishment_history', { punishment_id: punishment.id, applied_date: null, day_of_week: 0, points_deducted: 0 }, false);
    await unlink(sub);

    await t.test('only original archived membership appears, with no live or foreign period or identity fields', async () => {
      const result = await list(dom), i = await identity(dom);
      assert.deepEqual(result.scope, { currentPeriodId: i.relationship_id, currentSessionId: i.relationship_session_id });
      assert.equal(result.periods.some(x => x.periodId === i.relationship_id), false);
      assert.equal(result.periods.some(x => x.periodId === foreignPeriod), false);
      assert.equal(result.periods.find(x => x.periodId === pair)?.label, 'Former partner');
      assert.ok(result.periods.some(x => x.label === 'Earlier solo period'));
      for (const item of result.periods) assert.deepEqual(Object.keys(item).sort(), ['endedAt','label','periodId','startedAt']);
      for (const a of accounts) assert.equal(JSON.stringify(result).includes(a.id), false);
      const solo = await page(dom, earlierSolo, 'task'); privacy(solo);
      assert.deepEqual(solo.rows.map(x => x.key), [`imported:${soloHistory.id}`]);
      denied(await rpc(sub, 'get_my_retained_activity_history', { ...scope(await identity(sub)), p_retained_relationship_id: earlierSolo, p_domain: 'task' }), 'RETAINED_PERIOD_NOT_FOUND');
      denied(await rpc(newSub, 'get_my_retained_activity_history', { ...scope(await identity(newSub)), p_retained_relationship_id: pair, p_domain: 'task' }), 'RETAINED_PERIOD_NOT_FOUND');
      denied(await rpc(dom, 'get_my_retained_activity_history', { ...scope(i), p_retained_relationship_id: randomUUID(), p_domain: 'task' }), 'RETAINED_PERIOD_NOT_FOUND');
      for (const table of ['action_events','action_point_entries','task_completion_history','reward_usage','rule_violations','punishment_history'])
        assert.deepEqual(await rows(table, `relationship_id=eq.${pair}&select=id`, dom.token), [], 'Raw archived table access changed');
    });
    await t.test('all four actor-beneficiary combinations remain shared; each side gets masked relative labels', async () => {
      const a = await page(dom, pair, 'task'), b = await page(sub, pair, 'task'); privacy(a); privacy(b);
      assert.deepEqual(a.rows.map(x => x.key), b.rows.map(x => x.key));
      const expected = [['you','you'],['you','former_partner'],['former_partner','you'],['former_partner','former_partner']];
      eventIds.forEach((id, n) => {
        const x = a.rows.find(x => x.key === `native:${id}`); assert.ok(x);
        assert.deepEqual([x.actor,x.beneficiary], expected[n]); assert.equal(x.pointEffects[0].amount, 2);
        assert.equal(x.title.text, 'Recorded task title'); assert.equal(x.title.basis, 'recorded_snapshot');
      });
      assert.equal(a.rows.find(x => x.key === `native:${reversal.id}`).reversesKey, `native:${eventIds[0]}`);
      assert.equal(a.rows.find(x => x.key === `native:${reversal.id}`).pointEffects[0].amount, -2);
      assert.equal(a.rows.filter(x => x.source === 'imported').length, 2, 'Native projection duplicated');
    });
    await t.test('all domain effects and zero values survive without invented person calendars or legacy facts', async () => {
      const r = await page(dom, pair, 'reward'), u = await page(dom, pair, 'rule'), p = await page(dom, pair, 'punishment');
      for (const result of [r,u,p]) privacy(result);
      assert.equal(r.rows.find(x => x.key === `native:${rewardEvent.id}`).pointEffects[0].amount, 0);
      const starting = r.rows.find(x => x.key === `native:${openingInventory.id}`);
      assert.equal(starting.provenance, 'legacy_import'); assert.equal(starting.actor, 'not_recorded');
      assert.equal(u.rows.find(x => x.key === `native:${ruleEvent.id}`).pointEffects.length, 0);
      assert.deepEqual(u.rows.find(x => x.key === `native:${missingTitleEvent.id}`).title, { text: null, basis: 'unavailable' });
      const punishmentRow = p.rows.find(x => x.key === `native:${punishmentEvent.id}`);
      assert.deepEqual(punishmentRow.calendar, calendar);
      assert.deepEqual(punishmentRow.pointEffects.map(x => [x.person,x.currency,x.amount]), [['you','dom',5],['former_partner','sub',0]]);
      assert.equal(punishmentRow.pointEffects.find(x => x.currency === 'sub').calendar, null);
      assert.deepEqual(punishmentRow.pointEffects.find(x => x.currency === 'dom').calendar,
        { localDate: '2026-10-19', weekStartDate: '2026-10-19', timeZone: 'Pacific/Honolulu' });
      const taskRows = await page(dom, pair, 'task');
      for (const result of [taskRows,r,u,p]) for (const row of result.rows.filter(x => x.source === 'imported')) {
        assert.equal(row.actor, 'not_recorded'); assert.equal(row.beneficiary, 'not_recorded');
        assert.equal(row.role, null); assert.equal(row.calendar, null); assert.equal(row.pointEffects, null); assert.equal(row.provenance, 'legacy_record');
        assert.equal(row.reversesKey, null);
      }
      const savedFalse = r.rows.find(x => x.key === `imported:${legacyIds.rewardFalse}`);
      assert.equal(savedFalse.kind, 'reward_use_record'); assert.equal(savedFalse.legacy.used, false);
      assert.deepEqual(savedFalse.title, { text: 'Current reward title', basis: 'current_reference' });
      const savedNull = r.rows.find(x => x.key === `imported:${legacyIds.rewardNull}`);
      assert.equal(savedNull.timestamp, null); assert.equal(savedNull.legacy.used, null);
      assert.deepEqual(savedNull.title, { text: null, basis: 'unavailable' });
      assert.deepEqual(r.rows.find(x => x.key === `imported:${legacyIds.rewardForeign}`).title, { text: null, basis: 'unavailable' });
      assert.deepEqual(u.rows.find(x => x.key === `imported:${legacyIds.rule}`).legacy, { dayOfWeek: 6, weekNumber: 'historical-format' });
      assert.equal(p.rows.find(x => x.key === `imported:${legacyIds.punishment}`).legacy.pointsDeducted, 0);
      assert.equal(r.rows.filter(x => x.source === 'imported').length, 3);
      assert.equal(u.rows.filter(x => x.source === 'imported').length, 1);
      assert.equal(p.rows.filter(x => x.source === 'imported').length, 2);
      for (const result of [taskRows,r,u,p]) for (const row of unscopedRows) assert.equal(result.rows.some(x => x.key === `imported:${row.id}`), false);
    });
    await t.test('keyset pagination crosses native/imported ties and null timestamps exactly once', async () => {
      for (const domain of ['task','reward','rule','punishment']) {
        const whole = await page(dom, pair, domain, { p_limit: 100 }), received = [];
        let cursor = null, pages = 0;
        do {
          const result = await page(dom, pair, domain, { p_limit: 1, p_cursor: cursor }); privacy(result);
          assert.ok(++pages <= 30, 'Cursor did not finish'); assert.ok(result.rows.length <= 1);
          received.push(...result.rows); cursor = result.nextCursor;
        } while (cursor !== null);
        assert.deepEqual(received, whole.rows); assert.equal(new Set(received.map(x => x.key)).size, received.length);
        const firstNull = received.findIndex(x => x.timestamp === null);
        if (firstNull >= 0) assert.ok(received.slice(firstNull).every(x => x.timestamp === null));
      }
    });
    await t.test('cursor, caller, domain and session mismatches fail without changing data', async () => {
      const before = await digest(), i = await identity(dom), first = await page(dom, pair, 'task', { p_limit: 1 });
      assert.ok(first.nextCursor);
      const base = { ...scope(i), p_retained_relationship_id: pair, p_domain: 'task' };
      for (const limit of [0,-1,101,null]) denied(await rpc(dom, 'get_my_retained_activity_history', { ...base, p_limit: limit }), 'INVALID_HISTORY_LIMIT');
      for (const domain of [null,'wallet','messages']) denied(await rpc(dom, 'get_my_retained_activity_history', { ...base, p_domain: domain }), 'INVALID_HISTORY_DOMAIN');
      for (const cursor of ['', 'invalid', 'e30=', 'a'.repeat(2049)]) denied(await rpc(dom, 'get_my_retained_activity_history', { ...base, p_cursor: cursor }), 'INVALID_HISTORY_CURSOR');
      denied(await rpc(dom, 'get_my_retained_activity_history', { ...base, p_domain: 'reward', p_cursor: first.nextCursor }), 'INVALID_HISTORY_CURSOR');
      denied(await rpc(dom, 'get_my_retained_activity_history', { ...base, p_retained_relationship_id: earlierSolo, p_cursor: first.nextCursor }), 'INVALID_HISTORY_CURSOR');
      denied(await rpc(sub, 'get_my_retained_activity_history', { ...scope(await identity(sub)), p_retained_relationship_id: pair, p_domain: 'task', p_cursor: first.nextCursor }), 'INVALID_HISTORY_CURSOR');
      denied(await rpc(dom, 'get_my_retained_activity_history', { ...base, p_expected_relationship_session_id: randomUUID() }), 'STALE_RELATIONSHIP_SESSION');
      denied(await rpc(dom, 'get_my_retained_activity_history', { ...base, p_expected_relationship_id: pair, p_expected_relationship_session_id: initialSession }), 'STALE_RELATIONSHIP');
      denied(await rpc(null, 'get_my_retained_activity_history', base));
      denied(await rpc(dom, '_retained_activity_person', { p_viewer: dom.id, p_period: pair, p_participant: subMember }));
      for (const domain of ['task','reward','rule','punishment']) await page(dom, pair, domain);
      await list(dom); assert.deepEqual(await digest(), before, 'Read changed data or activated a gate');
    });
    await t.test('deleted-member metadata masks labels without deleting surviving shared evidence', async () => {
      await ownedPeriod(pair);
      // Simulate the completed deletion identity state only. The real deletion gate stays closed.
      ok(await req('PATCH', `/rest/v1/relationship_period_members?participant_id=eq.${subMember}`, service, { user_id: null }));
      try {
        assert.equal((await list(dom)).periods.find(x => x.periodId === pair).label, 'Deleted account');
        const result = await page(dom, pair, 'task'); privacy(result);
        assert.equal(result.rows.find(x => x.key === `native:${eventIds[3]}`).actor, 'deleted_account');
        assert.equal(result.rows.find(x => x.key === `native:${eventIds[3]}`).pointEffects[0].person, 'deleted_account');
      } finally { ok(await req('PATCH', `/rest/v1/relationship_period_members?participant_id=eq.${subMember}`, service, { user_id: sub.id })); }
    });
    await t.test('Continue rejects the old read context and reactivated archive; Fresh retains old masking', async () => {
      const old = await identity(dom), cursor = (await page(dom, pair, 'task', { p_limit: 1 })).nextCursor;
      assert.equal(await link(dom, sub, 'continue', pair), pair);
      denied(await rpc(dom, 'get_my_retained_activity_history', { ...scope(old), p_retained_relationship_id: pair, p_domain: 'task' }), 'STALE_RELATIONSHIP');
      denied(await rpc(dom, 'get_my_retained_activity_history', { ...scope(await identity(dom)), p_retained_relationship_id: pair, p_domain: 'task' }), 'RETAINED_PERIOD_NOT_ARCHIVED');
      assert.equal((await list(dom)).periods.some(x => x.periodId === pair), false);
      await unlink(sub);
      denied(await rpc(dom, 'get_my_retained_activity_history', { ...scope(await identity(dom)), p_retained_relationship_id: pair, p_domain: 'task', p_cursor: cursor }), 'INVALID_HISTORY_CURSOR');
      const fresh = await link(dom, sub); assert.notEqual(fresh, pair);
      assert.equal((await page(dom, pair, 'task')).rows.find(x => x.key === `native:${eventIds[3]}`).actor, 'former_partner');
      await unlink(sub);
      await link(dom, newSub);
      denied(await rpc(newSub, 'get_my_retained_activity_history', { ...scope(await identity(newSub)), p_retained_relationship_id: pair, p_domain: 'task' }), 'RETAINED_PERIOD_NOT_FOUND');
      const future = (await identity(dom)).relationship_id;
      await unlink(newSub);
      denied(await rpc(sub, 'get_my_retained_activity_history', { ...scope(await identity(sub)), p_retained_relationship_id: future, p_domain: 'task' }), 'RETAINED_PERIOD_NOT_FOUND');
      assert.equal((await page(sub, pair, 'task')).rows.length, 7);
    });
  } finally {
    // Collect only fixture-owned periods; never widen cleanup to a global table.
    for (const a of accounts) await identity(a);
    for (const p of periods) await ownedPeriod(p);
    for (const { table, id } of unscopedRows) {
      const existing = await rows(table, `id=eq.${id}&select=user_id,relationship_id`);
      assert.ok(existing.every(x => accounts.some(a => a.id === x.user_id) && x.relationship_id === null));
      ok(await req('DELETE', `/rest/v1/${table}?id=eq.${id}`, service));
    }
    // Child tables first across ALL fixture periods, including legacy references
    // to another fixture period. Reversals are deleted with their originals.
    for (const table of ['notification_jobs','action_feedback_acknowledgments','action_feedback_outbox','action_command_receipts',
      'reward_usage','task_completion_history','rule_violations','punishment_history','action_inventory_movements','action_point_entries',
      'reward_inventory_lots','action_events','action_task_openings','action_wallets','action_accounting_periods','rewards','tasks','rules','punishments']) {
      for (const p of periods) ok(await req('DELETE', `/rest/v1/${table}?relationship_id=eq.${p}`, service));
    }
    for (const a of accounts) { ownedAccount(a); ok(await req('PATCH', `/rest/v1/profiles?id=eq.${a.id}`, service, { linked_partner_id: null })); }
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
