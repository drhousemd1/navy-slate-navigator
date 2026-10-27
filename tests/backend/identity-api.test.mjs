/**
 * Real Auth/PostgREST integration test. Never applies migrations or contacts a
 * remote Supabase project. Run only after the parent reviews/applies the SQL:
 * OBEDIENCE_LOCAL_STATUS_FILE=/absolute/private/status.private.json \
 *   node --test tests/backend/identity-api.test.mjs
 *
 * Creates disposable synthetic accounts, marks ONLY those accounts lifecycle
 * ready via the local service role, then removes their rows/accounts. Existing
 * profile/data hashes and document memberships must remain unchanged.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

const statusFile = process.env.OBEDIENCE_LOCAL_STATUS_FILE;
test('server identity, permissions and staged relationship periods', {
  skip: statusFile ? false : 'Set OBEDIENCE_LOCAL_STATUS_FILE after reviewed local migration application.',
  timeout: 120_000,
}, async (t) => {
  assert.ok(statusFile.startsWith('/'), 'Private runtime status must be an absolute local path');
  const status = JSON.parse(await readFile(statusFile, 'utf8'));
  assert.equal(status.runtime, 'native');
  assert.equal(status.env.API_URL, 'http://127.0.0.1:28622', 'Only the existing loopback API is allowed');
  assert.equal(new URL(status.env.DB_URL).hostname, '127.0.0.1');
  assert.equal(new URL(status.env.DB_URL).port, '20324');
  const api = status.env.API_URL;
  const anon = status.env.ANON_KEY;
  const service = status.env.SERVICE_ROLE_KEY;
  assert.ok(anon && service, 'Local API keys are missing');
  const accounts = [];
  const createdEntities = [];
  const fixturePeriods=new Set(),reviewedSessions=new Map(),accountSessions=new Map();
  const scopeFor=id=>({p_expected_relationship_id:id,p_expected_relationship_session_id:reviewedSessions.get(id)});
  const stable = (v) => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])])) : v;
  const hash = v => createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
  async function request(method, path, token = anon, body) {
    assert.match(path, /^\/(auth|rest)\/v1\//);
    const url = new URL(path, api);
    assert.equal(url.origin, api);
    const response = await fetch(url, {
      method, headers: { apikey: token === service ? service : anon,
        Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation',
        ...(accountSessions.has(token)?{'x-relationship-session-id':accountSessions.get(token)}:{}) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(12_000),
      redirect: 'error',
    });
    const text = await response.text();
    let data; try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    return { status: response.status, data };
  }
  const ok = r => { assert.ok(r.status >= 200 && r.status < 300, `API status ${r.status}; code ${r.data?.code ?? r.data?.error_code ?? 'none'}`); return r.data; };
  const denied = (r, code) => { assert.ok(r.status >= 400, `Expected denial, got ${r.status}`); if (code) assert.equal(r.data?.message, code); };
  const rpc = (account, name, body = {}) => request('POST', `/rest/v1/rpc/${name}`, account?.token ?? anon, body);
  const identity = async account => {
    const result=ok(await rpc(account,'get_my_identity'));
    if(result.relationship_id){
      assert.ok(result.relationship_session_id,'Apply reviewed session migration before fixtures');
      fixturePeriods.add(result.relationship_id);reviewedSessions.set(result.relationship_id,result.relationship_session_id);
      accountSessions.set(account.token,result.relationship_session_id);
    }
    return result;
  };
  const unlink = async a => {
    const current=await identity(a),result=await rpc(a,'unlink_my_partner',scopeFor(current.relationship_id));
    if(result.status<300){await identity(a);const peer=accounts.find(x=>x.id===current.linked_partner_id);if(peer)await identity(peer);}
    return result;
  };
  const rows = async (table, token = service, query = 'select=*') => ok(await request('GET', `/rest/v1/${table}?${query}`, token));
  async function account(role, { signup = false } = {}) {
    const email = `identity-${randomUUID()}@example.invalid`;
    const password = randomBytes(24).toString('base64url');
    const metadata = role === undefined ? {} : { role };
    const result = ok(await request('POST', signup ? '/auth/v1/signup' : '/auth/v1/admin/users', signup ? anon : service,
      signup ? { email, password, data: metadata } : { email, password, email_confirm: true, user_metadata: metadata }));
    const id = result.user?.id ?? result.id;
    assert.ok(id, 'Auth must return a synthetic user ID');
    const a = { id, email, password, token: null };
    accounts.push(a); // cleanup survives a later failed sign-in/assertion
    if (signup && !result.session?.access_token && !result.access_token) {
      ok(await request('PUT', `/auth/v1/admin/users/${id}`, service, { email_confirm: true }));
    }
    const signedIn = ok(await request('POST', '/auth/v1/token?grant_type=password', anon, { email, password }));
    a.token = signedIn.access_token;
    assert.ok(a.token);
    await identity(a);
    return a;
  }
  async function enableFixture(a) {
    assert.ok(accounts.some(x=>x.id===a.id) && !originalProfileIds.includes(a.id));
    const current=await identity(a);
    const existing=await rows('action_accounting_periods',service,`relationship_id=eq.${current.relationship_id}&select=*`);
    if(existing.length===0)ok(await request('POST','/rest/v1/rpc/activate_action_accounting',service,{p_relationship_id:current.relationship_id}));
    else assert.ok(existing.length===1 && existing[0].accounting_enabled && existing[0].activation_id,'Never reset an existing ledger');
    const result = ok(await request('PATCH', `/rest/v1/identity_contexts?user_id=eq.${a.id}`, service, { lifecycle_ready: true }));
    assert.equal(result.length, 1);
  }
  async function invite(a, mode = 'fresh', previous = null) {
    const reviewedPeriod = (await identity(a)).relationship_id;
    return ok(await rpc(a, 'generate_partner_link_code', {
      ...scopeFor(reviewedPeriod), p_mode: mode, p_previous_relationship_id: previous,
    }));
  }
  async function accept(a, invitation, reviewedPeriod = undefined) {
    const expectedPeriod = reviewedPeriod === undefined ? (await identity(a)).relationship_id : reviewedPeriod;
    const result=await rpc(a, 'accept_partner_link_code', {
      ...scopeFor(expectedPeriod),
      p_code: invitation.code, p_mode: invitation.mode, p_previous_relationship_id: invitation.previous_relationship_id,
    });
    if(result.status<300){await identity(a);const peer=accounts.find(x=>x.id===result.data.linked_partner_id);if(peer)await identity(peer);}
    return result;
  }
  // Service-only construction of a synthetic imported existing pair. This is
  // NOT the Fresh product flow: no accounting exists until the cutover test.
  async function seedImportedPair(dom,sub) {
    assert.notEqual(dom.id,sub.id);
    const candidates=[dom,sub],oldPeriods=[];
    const originalIds=new Set(originalProfileIds);
    for(const [a,role] of [[dom,'dom'],[sub,'sub']]) {
      assert.ok(accounts.some(x=>x.id===a.id) && !originalIds.has(a.id));
      const p=await rows('profiles',service,`id=eq.${a.id}&select=*`);
      const c=await rows('identity_contexts',service,`user_id=eq.${a.id}&select=*`);
      assert.equal(p.length,1);assert.equal(p[0].role,role);assert.equal(p[0].linked_partner_id,null);
      assert.equal(c.length,1);assert.equal(c[0].lifecycle_ready,false);
      const old=c[0].relationship_id;assert.ok(fixturePeriods.has(old));oldPeriods.push(old);
      const r=await rows('relationship_periods',service,`id=eq.${old}&select=*`);
      const m=await rows('relationship_period_members',service,`relationship_id=eq.${old}&select=*`);
      assert.equal(r.length,1);assert.equal(r[0].status,'active');assert.equal(m.length,1);
      assert.equal(m[0].user_id,a.id);assert.equal(m[0].role,role);
      for(const table of ['action_accounting_periods','action_wallets','action_events','action_command_receipts',
        'rules','tasks','rewards','punishments','rule_violations','task_completion_history','reward_usage',
        'punishment_history','wellbeing_snapshots','messages','archived_messages'])
        assert.equal((await rows(table,service,`relationship_id=eq.${old}&select=relationship_id`)).length,0,`New solo ${table} must be empty`);
      assert.equal((await rows('partner_link_invitations',service,`user_id=eq.${a.id}&select=user_id`)).length,0);
    }
    assert.equal(new Set(oldPeriods).size,2);
    const id=randomUUID();fixturePeriods.add(id); // Track before the first write/lost response.
    const members=candidates.map((a,index)=>({participant_id:randomUUID(),relationship_id:id,user_id:a.id,role:index===0?'dom':'sub'}));
    ok(await request('POST','/rest/v1/relationship_periods',service,{id}));
    ok(await request('POST','/rest/v1/relationship_period_members',service,members));
    for(const a of candidates)ok(await request('PATCH',`/rest/v1/identity_contexts?user_id=eq.${a.id}`,service,{relationship_id:id,lifecycle_ready:false}));
    ok(await request('PATCH',`/rest/v1/profiles?id=eq.${dom.id}`,service,{linked_partner_id:sub.id}));
    ok(await request('PATCH',`/rest/v1/profiles?id=eq.${sub.id}`,service,{linked_partner_id:dom.id}));
    for(const old of oldPeriods)ok(await request('PATCH',`/rest/v1/relationship_periods?id=eq.${old}`,service,{status:'archived',ended_at:new Date().toISOString()}));
    const saved=await rows('relationship_period_members',service,`relationship_id=eq.${id}&select=participant_id,relationship_id,user_id,role`);
    assert.deepEqual(saved.sort((a,b)=>a.participant_id.localeCompare(b.participant_id)),members.sort((a,b)=>a.participant_id.localeCompare(b.participant_id)));
    assert.equal((await rows('action_accounting_periods',service,`relationship_id=eq.${id}&select=relationship_id`)).length,0);
    for(const a of candidates){const i=await identity(a);assert.equal(i.status,'ready_linked');assert.equal(i.relationship_id,id);assert.equal(i.lifecycle_ready,false);}
    return id;
  }
  async function insertEntity(a, table, body) {
    const result = ok(await request('POST', `/rest/v1/${table}`, a.token, body));
    assert.equal(result.length, 1);
    createdEntities.push({ table, id: result[0].id });
    return result[0];
  }

  // Fail before creating anything if SQL has not been reviewed/applied.
  assert.equal(ok(await request('POST', '/rest/v1/rpc/current_relationship_id', anon, {})), null);
  denied(await rpc(null, 'get_my_identity'));
  await rows('relationship_periods',service,'select=relationship_session_id&limit=0');
  const originalPeriods=await rows('relationship_periods');
  const originalPeriodIds=new Set(originalPeriods.map(x=>x.id));
  const originalProfiles = await rows('profiles');
  const originalProfileIds = originalProfiles.map(x => x.id);
  const originalContexts = await rows('identity_contexts');
  const originalMembers = await rows('relationship_period_members');
  for (const p of originalProfiles) {
    const context = originalContexts.find(c => c.user_id === p.id);
    assert.ok(context, 'Original profile needs a backfilled period');
    assert.equal(context.lifecycle_ready, false, 'Restored-account lifecycle must stay locked');
    assert.ok(originalMembers.some(m => m.user_id === p.id && m.relationship_id === context.relationship_id && m.role === p.role));
    const partner = originalProfiles.find(x => x.id === p.linked_partner_id);
    if (partner && partner.linked_partner_id === p.id && partner.role !== p.role) {
      assert.equal(originalContexts.find(c => c.user_id === partner.id).relationship_id, context.relationship_id);
    }
  }
  const originalDocumentReaders = hash(await rows('admin_document_readers'));
  const protectedTables = ['rules','tasks','rewards','punishments','rule_violations','task_completion_history',
    'reward_usage','punishment_history','wellbeing_snapshots','messages','archived_messages','user_roles'];
  const originalRows = new Map();
  for (const table of protectedTables) {
    const data = await rows(table);
    originalRows.set(table, { ids: new Set(data.map(x => x.id)), hash: hash(data.sort((a,b) => a.id.localeCompare(b.id))) });
  }
  let dom; let sub; let stranger; let sameRole; let originalPeriod;
  try {
    await t.test('Auth signup normalizes both legacy aliases and requires explicit setup when role is missing', async () => {
      dom = await account('dominant', { signup: true });
      sub = await account('submissive', { signup: true });
      stranger = await account('sub');
      sameRole = await account('dom');
      const missing = await account(undefined);
      const invalid = await account('admin');
      assert.equal((await identity(dom)).role, 'dom');
      assert.equal((await identity(sub)).role, 'sub');
      assert.equal((await identity(missing)).status, 'missing_profile');
      assert.equal((await identity(invalid)).status, 'missing_profile');
      denied(await rpc(missing, 'set_my_profile_role', { p_role: 'admin' }), 'INVALID_PROFILE_ROLE');
      const fixed = ok(await rpc(missing, 'set_my_profile_role', { p_role: 'submissive' }));
      assert.equal(fixed.status, 'ready_solo');
      assert.equal(fixed.sub_user_id, missing.id);
      assert.equal(fixed.dom_user_id, null);
      assert.equal(fixed.lifecycle_ready, false);
      denied(await rpc(dom, 'generate_partner_link_code', scopeFor((await identity(dom)).relationship_id)), 'LIFECYCLE_INTEGRATION_REQUIRED');
      for (const a of [dom, sub, stranger, sameRole]) await enableFixture(a);
    });

    await t.test('private membership/invitation tables cannot be enumerated or unlocked; profile roles/pointers/admin cannot be forged', async () => {
      for (const table of ['identity_contexts','relationship_periods','relationship_period_members','partner_link_invitations','admin_document_readers']) {
        denied(await request('GET', `/rest/v1/${table}?select=*`, dom.token));
        denied(await request('GET', `/rest/v1/${table}?select=*`));
      }
      for (const [name, body] of [['_identity_lock',{}],['_identity_make_solo',{p_user:dom.id}],
        ['_identity_peer',{p_user:dom.id}],['_identity_require_lifecycle',{p_user:dom.id}],
        ['_identity_archive',{p_period:(await identity(dom)).relationship_id}]]) {
        denied(await rpc(dom,name,body));
        denied(await rpc(null,name,body));
      }
      denied(await request('PATCH', `/rest/v1/identity_contexts?user_id=eq.${stranger.id}`, stranger.token, { lifecycle_ready: true }));
      for (const body of [{ linked_partner_id: sub.id }, { role: 'sub' }, { partner_link_code: 'FAKE' }, { id: randomUUID() }]) {
        denied(await request('PATCH', `/rest/v1/profiles?id=eq.${dom.id}`, dom.token, body));
      }
      denied(await request('POST', '/rest/v1/profiles', dom.token, { id: dom.id, role: 'dom', points: 100 }));
      denied(await request('DELETE', `/rest/v1/profiles?id=eq.${dom.id}`, dom.token));
      denied(await request('POST', '/rest/v1/user_roles', dom.token, { user_id: dom.id, role: 'admin' }));
      denied(await request('PATCH', `/rest/v1/user_roles?user_id=eq.${dom.id}`, dom.token, { role: 'admin' }));
      denied(await request('DELETE', `/rest/v1/user_roles?user_id=eq.${dom.id}`, dom.token));
      assert.equal(ok(await rpc(dom, 'has_role', { requested_user_id: dom.id, requested_role: 'admin' })), false);
      assert.equal((await rows('profiles', stranger.token)).length, 1);
      ok(await request('POST','/rest/v1/user_roles',service,{user_id:dom.id,role:'admin'}));
      assert.equal(ok(await rpc(dom,'has_role',{requested_user_id:dom.id,requested_role:'admin'})),true);
      assert.equal(ok(await rpc(stranger,'has_role',{requested_user_id:dom.id,requested_role:'admin'})),false);
      ok(await request('DELETE',`/rest/v1/user_roles?user_id=eq.${dom.id}`,service));
      denied(await request('GET', '/rest/v1/profiles?select=*'));
      // Arbitrary user_metadata never becomes canonical profile or app authority.
      ok(await request('PUT', '/auth/v1/user', dom.token, { data: { role: 'sub', is_admin: true, linked_partner_id: sub.id } }));
      assert.equal((await identity(dom)).role, 'dom');
      assert.equal((await identity(dom)).linked_partner_id, null);
    });

    await t.test('generation and acceptance reject stale, null or omitted periods without changing valid invitations', async () => {
      const issuer = await account('dom');
      const recipient = await account('sub');
      const temporaryPartner = await account('dom');
      for (const a of [issuer,recipient,temporaryPartner]) await enableFixture(a);
      const reviewedPeriod = (await identity(recipient)).relationship_id;
      const delayedInvitation = await invite(issuer);
      ok(await accept(recipient,await invite(temporaryPartner)));
      ok(await unlink(recipient));
      const current = await identity(recipient);
      assert.notEqual(current.relationship_id,reviewedPeriod);
      const currentCode = await invite(recipient);
      for (const expected of [reviewedPeriod,null]) {
        denied(await rpc(recipient,'generate_partner_link_code', {
          ...scopeFor(expected),p_mode:'fresh',p_previous_relationship_id:null,
        }),'STALE_RELATIONSHIP');
        denied(await accept(recipient,delayedInvitation,expected),'STALE_RELATIONSHIP');
      }
      // A legacy overload must not remain callable by leaving out the new argument.
      for (const [name,body] of [
        ['generate_partner_link_code',{p_mode:'fresh',p_previous_relationship_id:null}],
        ['accept_partner_link_code',{p_code:delayedInvitation.code,p_mode:'fresh',p_previous_relationship_id:null}],
      ]) {
        const absent = await rpc(recipient,name,body);
        assert.equal(absent.status,404);
        assert.equal(absent.data.code,'PGRST202');
      }
      const after = await identity(recipient);
      assert.equal(after.relationship_id,current.relationship_id);
      assert.equal(after.linked_partner_id,null);
      assert.equal(after.partner_link_code,currentCode.code);
      assert.equal((await identity(issuer)).partner_link_code,delayedInvitation.code);
      const accepted = ok(await accept(recipient,delayedInvitation,current.relationship_id));
      assert.equal(accepted.status,'ready_linked');
      assert.equal(accepted.linked_partner_id,issuer.id);
      ok(await unlink(recipient));
    });

    await t.test('codes rotate, reject same role/self/forgery, require matching consent, and can only be consumed once', async () => {
      const old = await invite(dom);
      const current = await invite(dom);
      assert.match(current.code, /^[A-F0-9]{32}$/);
      assert.equal(current.expires_at, null); // No unsupported expiry claim.
      assert.notEqual(current.code, old.code);
      denied(await accept(sub, old), 'INVALID_LINK_CODE');
      denied(await accept(dom, current), 'INVALID_LINK_CODE');
      denied(await accept(sameRole, current), 'SAME_ROLE');
      denied(await accept(sub, { ...current, code: 'F'.repeat(32) }), 'INVALID_LINK_CODE');
      denied(await accept(sub, { ...current, mode: 'continue' }), 'CONSENT_MISMATCH');
      const preview = ok(await rpc(sub, 'preview_partner_link_code', { p_code: current.code }));
      assert.deepEqual(Object.keys(preview).sort(), ['can_continue_previous','mode','previous_relationship_id']);
      const linked = ok(await accept(sub, current));
      originalPeriod = linked.relationship_id;
      assert.equal(linked.status, 'ready_linked');
      assert.equal(linked.dom_user_id, dom.id);
      assert.equal(linked.sub_user_id, sub.id);
      assert.equal((await identity(dom)).relationship_id, originalPeriod);
      assert.equal((await rows('action_accounting_periods',service,`relationship_id=eq.${originalPeriod}&select=accounting_enabled`))[0].accounting_enabled,true);
      assert.deepEqual((await rows('action_wallets',service,`relationship_id=eq.${originalPeriod}&select=balance`)).map(x=>x.balance),[0,0]);
      denied(await accept(stranger, current), 'INVALID_LINK_CODE');
      assert.equal(ok(await rpc(dom, 'get_linked_partner_id', { user_id_param: dom.id })), sub.id);
      assert.equal(ok(await rpc(dom, 'get_linked_partner_id', { user_id_param: sub.id })), dom.id);
      assert.equal(ok(await rpc(dom, 'get_linked_partner_id', { user_id_param: stranger.id })), null);
      assert.equal((await rows('profiles', dom.token)).length, 2);
      assert.equal((await rows('profiles', stranger.token)).length, 1);
    });

    await t.test('separate imported existing pair preserves the disabled legacy-write baseline before cutover',async()=>{
      // The preceding accounts tested the real Fresh path. These are new accounts
      // representing an existing imported pair; no activated ledger is reset.
      dom=await account('dom');sub=await account('sub');
      originalPeriod=await seedImportedPair(dom,sub);
    });

    await t.test('disabled imported pair retains own preferences/shared balance writes and Dom-only choices', async () => {
      ok(await request('PATCH', `/rest/v1/profiles?id=eq.${dom.id}`, dom.token, { nickname: 'Synthetic Dom' }));
      denied(await request('PATCH', `/rest/v1/profiles?id=eq.${sub.id}`, dom.token, { nickname: 'Changed by partner' }), 'OWN_PROFILE_FIELDS_ONLY');
      ok(await request('PATCH', `/rest/v1/profiles?id=eq.${sub.id}`, dom.token, { points: 17, dom_points: 2 }));
      ok(await request('PATCH', `/rest/v1/profiles?id=eq.${dom.id}`, sub.token, { points: 3, dom_points: 23 }));
      const changed = ok(await rpc(dom, 'set_relationship_permissions', { p_permissions: { sub_reward_redeem: 'dom', task_undo: 'both', rule_violation_undo: 'both' }, ...scopeFor(originalPeriod) }));
      assert.equal(changed.permissions.sub_reward_redeem, 'dom');
      denied(await rpc(sub, 'set_relationship_permissions', { p_permissions: { task_undo: 'sub' }, ...scopeFor(originalPeriod) }), 'LINKED_DOM_REQUIRED');
      for (const p_permissions of [{ purchase: 'both' }, { unlink: 'dom' }, { task_undo: 'nobody' }, []]) {
        denied(await rpc(dom, 'set_relationship_permissions', { p_permissions, ...scopeFor(originalPeriod) }));
      }
      assert.equal(ok(await rpc(sub, 'set_my_timezone', { p_timezone: 'America/Boise' })).timezone, 'America/Boise');
      denied(await rpc(sub, 'set_my_timezone', { p_timezone: 'Somewhere/Invalid' }), 'INVALID_TIMEZONE');
      denied(await rpc(sub, 'set_my_profile_role', { p_role: 'dom' }), 'UNLINK_BEFORE_ROLE_CHANGE');
    });

    let task; let message;
    await t.test('existing definition/history writers get server period stamps and cannot retag or read another period', async () => {
      task = await insertEntity(dom, 'tasks', { title: 'Identity synthetic task', user_id: sub.id, points: 5 });
      assert.equal(task.relationship_id, originalPeriod);
      const rule = await insertEntity(sub, 'rules', { title: 'Identity synthetic rule', user_id: dom.id });
      assert.equal(rule.relationship_id, originalPeriod);
      message = await insertEntity(dom, 'messages', { sender_id: dom.id, receiver_id: sub.id, content: 'Synthetic period message' });
      const history = await insertEntity(sub, 'task_completion_history', { task_id: task.id, user_id: sub.id });
      assert.equal(history.relationship_id, originalPeriod);
      assert.equal((await rows('tasks', stranger.token, `id=eq.${task.id}&select=id`)).length, 0);
      assert.equal((await rows('tasks', anon, `id=eq.${task.id}&select=id`)).length, 0);
      const strangerPeriod = (await identity(stranger)).relationship_id;
      denied(await request('PATCH', `/rest/v1/tasks?id=eq.${task.id}`, dom.token, { relationship_id: strangerPeriod }), 'PERIOD_IMMUTABLE');
      denied(await request('POST', '/rest/v1/tasks', dom.token, { title: 'Forged scope', user_id: dom.id, relationship_id: strangerPeriod }), 'PERIOD_MISMATCH');
      denied(await request('POST', '/rest/v1/tasks', dom.token, { title: 'Forged owner', user_id: stranger.id }), 'OWNER_OUTSIDE_PERIOD');
      denied(await request('POST', '/rest/v1/messages', sub.token, { sender_id: dom.id, receiver_id: sub.id, content: 'Forged' }), 'MESSAGE_SENDER_MISMATCH');
      denied(await rpc(stranger, 'record_task_completion', { task_id_param: task.id, user_id_param: sub.id }), 'TASK_OUTSIDE_PERIOD');
      assert.equal(ok(await rpc(stranger, 'get_task_completions_for_week', { week_start: new Date(Date.now()-86_400_000).toISOString() })).length, 0);
      await enableFixture(dom);await enableFixture(sub);
      assert.equal((await rows('action_wallets',service,`relationship_id=eq.${originalPeriod}&currency=eq.sub&select=balance`))[0].balance,17);
      assert.equal((await rows('action_wallets',service,`relationship_id=eq.${originalPeriod}&currency=eq.dom&select=balance`))[0].balance,23);
    });

    await t.test('unlink archives rather than retags; unrelated new partner never gains old rows or former profile identity', async () => {
      const solo = ok(await unlink(sub));
      assert.equal(solo.status, 'ready_solo');
      assert.notEqual(solo.relationship_id, originalPeriod);
      assert.equal((await identity(dom)).status, 'ready_solo');
      assert.equal((await rows('profiles', sub.token)).length, 1);
      assert.equal((await rows('messages', sub.token, `id=eq.${message.id}&select=id`)).length, 0);
      assert.equal((await rows('tasks', dom.token, `id=eq.${task.id}&select=id`)).length, 0);
      const listing = ok(await rpc(sub, 'list_my_relationship_periods'));
      const archived = listing.find(x => x.relationship_id === originalPeriod);
      assert.equal(archived.status, 'archived');
      assert.equal(archived.former_partner_label, 'Former partner');
      assert.ok(!JSON.stringify(listing).includes(dom.id), 'Archive metadata must not expose former account IDs');
      const newLink = ok(await accept(stranger, await invite(dom)));
      assert.notEqual(newLink.relationship_id, originalPeriod);
      assert.equal((await rows('tasks', stranger.token, `id=eq.${task.id}&select=id`)).length, 0);
      assert.equal((await rows('messages', stranger.token, `id=eq.${message.id}&select=id`)).length, 0);
      assert.ok(!ok(await rpc(stranger, 'list_my_relationship_periods')).some(x => x.relationship_id === originalPeriod));
      assert.equal((await rows('profiles', dom.token, `id=eq.${dom.id}&select=dom_points`))[0].dom_points, 0);
      ok(await unlink(dom));
    });

    await t.test('same verified pair explicitly continues archived state or starts a distinct fresh period', async () => {
      const continuation = await invite(dom, 'continue', originalPeriod);
      denied(await rpc(stranger, 'preview_partner_link_code', { p_code: continuation.code }), 'INVALID_LINK_CODE');
      denied(await accept(sub, { ...continuation, mode: 'fresh', previous_relationship_id: null }), 'CONSENT_MISMATCH');
      const resumed = ok(await accept(sub, continuation));
      assert.equal(resumed.relationship_id, originalPeriod);
      assert.equal((await rows('tasks', sub.token, `id=eq.${task.id}&select=id`)).length, 1);
      assert.equal((await rows('messages', sub.token, `id=eq.${message.id}&select=id`)).length, 1);
      assert.equal((await rows('profiles', sub.token, `id=eq.${sub.id}&select=points`))[0].points, 17);
      assert.equal((await rows('profiles', dom.token, `id=eq.${dom.id}&select=dom_points`))[0].dom_points, 23);
      ok(await unlink(dom));
      const fresh = ok(await accept(sub, await invite(dom)));
      assert.notEqual(fresh.relationship_id, originalPeriod);
      denied(await rpc(dom, 'unlink_my_partner', { ...scopeFor(originalPeriod) }), 'STALE_RELATIONSHIP');
      denied(await rpc(dom, 'set_relationship_permissions', { p_permissions: { task_undo: 'dom' }, ...scopeFor(originalPeriod) }), 'STALE_RELATIONSHIP');
      denied(await request('POST', '/rest/v1/tasks', sub.token, { title: 'Stale period', user_id: sub.id, relationship_id: originalPeriod }), 'PERIOD_MISMATCH');
      assert.equal(ok(await request('PATCH', `/rest/v1/tasks?id=eq.${task.id}`, sub.token, { title: 'Stale write' })).length, 0);
      assert.equal((await rows('tasks', sub.token, `id=eq.${task.id}&select=id`)).length, 0);
      assert.equal((await rows('profiles', sub.token, `id=eq.${sub.id}&select=points`))[0].points, 0);
      ok(await unlink(dom));
    });

    await t.test('concurrent claims have exactly one winner and never leave a partial pair', async () => {
      const code = await invite(dom);
      const results = await Promise.all([accept(sub, code), accept(stranger, code)]);
      assert.equal(results.filter(x => x.status >= 200 && x.status < 300).length, 1);
      const winner = results[0].status < 300 ? sub : stranger;
      const loser = winner === sub ? stranger : sub;
      assert.equal((await identity(dom)).linked_partner_id, winner.id);
      assert.equal((await identity(winner)).linked_partner_id, dom.id);
      assert.equal((await identity(loser)).status, 'ready_solo');
      ok(await unlink(dom));
    });

    await t.test('malformed incoming/outgoing pointers are explicit and repair does not unlink an unrelated valid pair', async () => {
      const unrelatedDom = await account('dom');
      const unrelatedSub = await account('sub');
      await enableFixture(unrelatedDom); await enableFixture(unrelatedSub);
      const unrelated = ok(await accept(unrelatedSub, await invite(unrelatedDom)));
      ok(await request('PATCH', `/rest/v1/profiles?id=eq.${dom.id}`, service, { linked_partner_id: unrelatedSub.id }));
      assert.equal((await identity(dom)).status, 'incomplete_partner');
      const repaired = ok(await unlink(dom));
      assert.equal(repaired.status, 'ready_solo');
      assert.equal((await identity(unrelatedDom)).relationship_id, unrelated.relationship_id);
      assert.equal((await identity(unrelatedSub)).status, 'ready_linked');
      ok(await request('PATCH', `/rest/v1/profiles?id=eq.${dom.id}`, service, { linked_partner_id: sameRole.id }));
      ok(await request('PATCH', `/rest/v1/profiles?id=eq.${sameRole.id}`, service, { linked_partner_id: dom.id }));
      assert.equal((await identity(dom)).status, 'same_role');
      assert.equal((await identity(dom)).sub_user_id, null);
      ok(await unlink(dom));
      assert.equal((await identity(sameRole)).status, 'ready_solo');
      const soloPeriod = (await identity(dom)).relationship_id;
      assert.equal(ok(await unlink(dom)).relationship_id,soloPeriod);
      ok(await request('PATCH',`/rest/v1/profiles?id=eq.${dom.id}`,service,{linked_partner_id:dom.id}));
      assert.equal((await identity(dom)).status,'invalid_partner');
      assert.equal(ok(await unlink(dom)).status,'ready_solo');
    });
  } finally {
    // Remove ONLY recorded fixture periods, ledger children before definitions.
    const fixtureIds=accounts.map(a=>a.id);
    if(fixtureIds.length)for(const m of await rows('relationship_period_members',service,
      `user_id=in.(${fixtureIds.join(',')})&select=relationship_id`))fixturePeriods.add(m.relationship_id);
    for(const id of fixturePeriods){
      assert.ok(!originalPeriodIds.has(id),'Never clean an original period');
      const members=await rows('relationship_period_members',service,`relationship_id=eq.${id}&select=user_id`);
      assert.ok(members.every(m=>m.user_id===null || fixtureIds.includes(m.user_id)),'Fixture period contains an unrelated member');
      for(const table of ['action_feedback_acknowledgments','action_feedback_outbox','action_command_receipts',
        'reward_usage','task_completion_history','rule_violations','punishment_history','action_inventory_movements',
        'action_point_entries','reward_inventory_lots','action_events','action_task_openings','action_wallets','action_accounting_periods'])
        ok(await request('DELETE',`/rest/v1/${table}?relationship_id=eq.${id}`,service));
    }
    for(const item of createdEntities.reverse())ok(await request('DELETE',`/rest/v1/${item.table}?id=eq.${item.id}`,service));
    for (const a of accounts) {
      ok(await request('PATCH', `/rest/v1/profiles?id=eq.${a.id}`, service, { linked_partner_id: null }));
    }
    for (const a of accounts) ok(await request('DELETE', `/auth/v1/admin/users/${a.id}`, service));
    for (const id of fixturePeriods) {
      ok(await request('DELETE', `/rest/v1/relationship_period_members?relationship_id=eq.${id}`, service));
      ok(await request('DELETE', `/rest/v1/relationship_periods?id=eq.${id}`, service));
    }
    assert.equal(hash((await rows('relationship_periods')).sort((a,b)=>a.id.localeCompare(b.id))),hash(originalPeriods.sort((a,b)=>a.id.localeCompare(b.id))),'Original periods changed or a fixture period remains');
    const afterProfiles = (await rows('profiles')).filter(x => originalProfileIds.includes(x.id));
    assert.equal(hash(afterProfiles.sort((a,b) => a.id.localeCompare(b.id))), hash(originalProfiles.sort((a,b) => a.id.localeCompare(b.id))), 'Original profile data, pointers and balances changed');
    assert.equal(hash(await rows('admin_document_readers')), originalDocumentReaders, 'Document-only membership changed');
    assert.equal(hash((await rows('identity_contexts')).filter(c => originalProfileIds.includes(c.user_id)).sort((a,b) => a.user_id.localeCompare(b.user_id))),
      hash(originalContexts.filter(c => originalProfileIds.includes(c.user_id)).sort((a,b) => a.user_id.localeCompare(b.user_id))), 'Original relationship context/readiness changed');
    for (const table of protectedTables) {
      const before = originalRows.get(table);
      const after = (await rows(table)).filter(x => before.ids.has(x.id)).sort((a,b) => a.id.localeCompare(b.id));
      assert.equal(hash(after), before.hash, `Original ${table} rows changed`);
    }
  }
});
