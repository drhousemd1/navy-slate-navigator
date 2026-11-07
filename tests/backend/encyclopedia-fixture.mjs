/** PRIVATE prepared helper. No import-time I/O. Uses only the parent's ready
 * recorded synthetic pair; never creates accounts or changes original grants. */
import assert from 'node:assert/strict';
import { readFile, writeFile, rename, lstat } from 'node:fs/promises';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
const baseline = new URL('../../../planning/operations/baseline/', import.meta.url);
const api = 'http://127.0.0.1:28622';
const uuid = x => typeof x === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
const tables = ['encyclopedia_entries', 'encyclopedia_entry_state', 'encyclopedia_editors', 'encyclopedia_command_receipts', 'user_roles'];
const canonical = x => Array.isArray(x) ? x.map(canonical) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, canonical(x[k])])) : x;
const digest = rows => createHash('sha256').update(JSON.stringify(rows.map(canonical).map(JSON.stringify).sort())).digest('hex');
async function privateJson(url) { const info = await lstat(url); assert.ok(info.isFile() && !info.isSymbolicLink() && (info.mode & 0o777) === 0o600, 'Expected private regular file'); return JSON.parse(await readFile(url, 'utf8')); }
export const syntheticDoc = { version: 1, blocks: [{ type: 'paragraph', children: [{ type: 'text', text: 'Synthetic <literal> library article', marks: { bold: true, underline: true, fontSize: '1.25rem' } }] }] };
export const syntheticImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==';
export async function openEncyclopediaFixture({ retention = false } = {}) {
  assert.ok(process.env.OBEDIENCE_ENCYCLOPEDIA_API_REVIEWED === '1', 'Explicit review flag required');
  if (retention) assert.ok(process.env.OBEDIENCE_ENCYCLOPEDIA_DELETE_EDITOR_AFTER_UI === '1', 'After-UI deletion flag required');
  process.umask(0o077);
  const runtime = await privateJson(new URL('../local-runtime/status.private.json', baseline));
  const fixture = await privateJson(new URL('real-app-browser-fixture.private.json', baseline));
  const original = await privateJson(new URL('real-app-browser-before.private.json', baseline));
  assert.ok(runtime.runtime === 'native' && runtime.env?.API_URL === api);
  const database = new URL(runtime.env.DB_URL); assert.ok(database.hostname === '127.0.0.1' && database.port === '20324');
  assert.ok(fixture.version === 1 && uuid(fixture.runId) && fixture.phase === 'ready' && fixture.api === api && fixture.databasePort === '20324');
  assert.ok(original.api === api && original.databasePort === '20324' && Array.isArray(original.authIds));
  assert.ok(Array.isArray(fixture.accounts) && fixture.accounts.length === 2 && new Set(fixture.accounts.map(a => a.id)).size === 2);
  for (const a of fixture.accounts) assert.ok(uuid(a.id) && !original.authIds.includes(a.id) && ['dom', 'sub'].includes(a.role) && a.email === `obedience-browser-${fixture.runId}-${a.role}@example.invalid` && typeof a.password === 'string');
  const a = fixture.accounts.find(x => x.role === 'dom'), b = fixture.accounts.find(x => x.role === 'sub'); assert.ok(a && b);
  const service = runtime.env.SERVICE_ROLE_KEY, anon = runtime.env.ANON_KEY; assert.ok(service && anon);
  async function request(method, path, token = service, body) {
    assert.match(path, /^\/(auth|rest|functions)\/v1\//); const url = new URL(path, api); assert.equal(url.origin, api);
    const r = await fetch(url, { method, redirect: 'error', signal: AbortSignal.timeout(45000), headers: { apikey: token === service ? service : anon,
      ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: body === undefined ? undefined : JSON.stringify(body) });
    let data = null; try { const text = await r.text(); data = text ? JSON.parse(text) : null; } catch { throw new Error('Unconfirmed synthetic API response'); }
    return { status: r.status, data };
  }
  const ok = r => { assert.ok(r.status >= 200 && r.status < 300, `Synthetic API request failed (${r.status})`); return r.data; };
  async function rows(table) { assert.ok(tables.includes(table)); const all = []; for (let offset = 0;; offset += 200) { const page = ok(await request('GET', `/rest/v1/${table}?select=*&limit=200&offset=${offset}`)); all.push(...page); if (page.length < 200) return all; } }
  const before = {}; for (const table of tables) before[table] = await rows(table);
  assert.ok(!before.user_roles.some(r => [a.id, b.id].includes(r.user_id) && r.role === 'admin'), 'Fixture must not receive global admin');
  if (!retention) assert.ok(!before.encyclopedia_editors.some(r => [a.id, b.id].includes(r.user_id)), 'Ordinary case requires fresh non-editor fixture');
  const state = { version: 1, fixtureRunId: fixture.runId, mode: retention ? 'after-ui-retention' : 'ordinary', phase: 'running', accountIds: [a.id, b.id], entries: [], commands: [], grantedEditors: [], deletedActor: null, deletion: null, before };
  const manifest = new URL(`encyclopedia-fixture-${fixture.runId}-${randomUUID()}.private.json`, baseline);
  await writeFile(manifest, JSON.stringify(state), { mode: 0o600, flag: 'wx' });
  async function save() { const tmp = new URL(`.encyclopedia-${randomUUID()}.tmp`, baseline); await writeFile(tmp, JSON.stringify(state), { mode: 0o600, flag: 'wx' }); await rename(tmp, manifest); }
  function ownAccount(account) { assert.ok([a, b].includes(account) && !original.authIds.includes(account.id)); }
  function ownEntry(id) { assert.ok(uuid(id) && state.entries.includes(id) && !before.encyclopedia_entries.some(r => r.id === id) && !before.encyclopedia_entry_state.some(r => r.entry_id === id)); }
  const rpc = (account, name, body = {}) => { ownAccount(account); return request('POST', `/rest/v1/rpc/${name}`, account.token, body); };
  async function login(account) { ownAccount(account); const result = ok(await request('POST', '/auth/v1/token?grant_type=password', anon, { email: account.email, password: account.password })); assert.ok(result.user.id === account.id && result.user.email === account.email); account.token = result.access_token; }
  await login(a); await login(b);
  async function grant(account) { ownAccount(account); if ((await rows('encyclopedia_editors')).some(r => r.user_id === account.id)) return;
    assert.ok(!before.encyclopedia_editors.some(r => r.user_id === account.id)); if (!state.grantedEditors.includes(account.id)) { state.grantedEditors.push(account.id); await save(); }
    ok(await request('POST', '/rest/v1/encyclopedia_editors', service, { user_id: account.id })); }
  async function revoke(account) { ownAccount(account); assert.ok(state.grantedEditors.includes(account.id) && !before.encyclopedia_editors.some(r => r.user_id === account.id)); ok(await request('DELETE', `/rest/v1/encyclopedia_editors?user_id=eq.${account.id}`)); }
  async function newEntry() { const id = randomUUID(); assert.ok(!before.encyclopedia_entries.some(r => r.id === id) && !before.encyclopedia_entry_state.some(r => r.entry_id === id)); state.entries.push(id); await save(); return id; }
  async function command(entryId, expectedRevision, patch) { ownEntry(entryId); const commandId = randomUUID(); state.commands.push(commandId); await save(); return { commandId, entryId, expectedRevision, ...(patch === undefined ? {} : { patch }) }; }
  const edge = (account, operation, value) => { ownAccount(account); ownEntry(value.entryId); assert.ok(state.commands.includes(value.commandId)); return request('POST', `/functions/v1/encyclopedia-admin/${operation}`, account.token, value); };
  function owned(table, row) {
    if (table === 'encyclopedia_entries') return state.entries.includes(row.id);
    if (table === 'encyclopedia_entry_state') return state.entries.includes(row.entry_id);
    if (table === 'encyclopedia_command_receipts') return state.commands.includes(row.command_id) && state.accountIds.includes(row.actor_user_id) && state.entries.includes(row.entry_id);
    if (table === 'encyclopedia_editors') return state.grantedEditors.includes(row.user_id);
    return false;
  }
  const departed = (table, row) => state.deletedActor && ['encyclopedia_editors', 'encyclopedia_command_receipts', 'user_roles'].includes(table) && (row.user_id === state.deletedActor || row.actor_user_id === state.deletedActor);
  async function verify() { for (const table of tables) assert.equal(digest((await rows(table)).filter(r => !owned(table, r) && !departed(table, r))), digest(before[table].filter(r => !departed(table, r))), `Protected ${table} changed`); }
  async function deleteEditorAfterUI() {
    assert.ok(retention && process.env.OBEDIENCE_ENCYCLOPEDIA_DELETE_EDITOR_AFTER_UI === '1'); ownAccount(a);
    const identity = ok(await rpc(a, 'get_my_identity')); assert.ok(identity.user_id === a.id && identity.lifecycle_ready === true, 'Enable synthetic lifecycle before after-UI deletion');
    assert.ok(fixture.periods.includes(identity.relationship_id) && !original.tables.relationship_periods.some(r => r.id === identity.relationship_id));
    const frozenProbe = await command(await newEntry(), 0, { title: 'Synthetic frozen curator probe', subtext: '', contentDocument: syntheticDoc });
    const deletion = { commandId: randomUUID(), expectedRelationshipId: identity.relationship_id, expectedRelationshipSessionId: identity.relationship_session_id, recoveryToken: randomBytes(32).toString('base64url') };
    state.deletion = deletion; state.deletedActor = a.id; await save();
    const initial = ok(await request('POST', '/functions/v1/account-deletion/start', a.token, deletion)); assert.ok(initial.jobId === deletion.commandId);
    assert.equal(initial.state, 'pending', 'Preparation must leave the account frozen before any resume');
    const frozen = result => { assert.equal(result.status, 403, 'Prepared synthetic curator must be rejected'); assert.equal(result.data?.error?.code ?? result.data?.message, 'ACCOUNT_UNAVAILABLE'); };
    frozen(await rpc(a, 'get_encyclopedia_library'));
    frozen(await edge(a, 'save', frozenProbe));
    frozen(await request('POST', '/rest/v1/rpc/encyclopedia_commit', service, { p_actor: a.id, p_operation: 'save',
      p_command_id: frozenProbe.commandId, p_entry_id: frozenProbe.entryId, p_expected_revision: frozenProbe.expectedRevision, p_patch: frozenProbe.patch }));
    for (let attempt = 0; attempt < 80; attempt++) {
      const result = ok(await request('POST', '/functions/v1/account-deletion/resume', '', { jobId: deletion.commandId, recoveryToken: deletion.recoveryToken }));
      if (result.state === 'complete') { assert.equal((await request('GET', `/auth/v1/admin/users/${a.id}`)).status, 404); state.deletionComplete = true; await save(); return; }
      assert.notEqual(result.state, 'retry_required', 'Retain private deletion capability for parent recovery');
      await delay(Math.min(Math.max(result.retryAfterMs, 250), 30000));
    }
    throw new Error('Synthetic curator deletion did not complete within bound');
  }
  async function cleanup() {
    try {
      state.phase = 'cleaning'; await save(); await verify();
      const editor = retention ? b : a; await grant(editor);
      for (const id of state.entries) {
        ownEntry(id); const entry = (await rows('encyclopedia_entries')).find(r => r.id === id);
        if (entry) { const revision = (await rows('encyclopedia_entry_state')).find(r => r.entry_id === id)?.revision ?? 1; ok(await edge(editor, 'delete', await command(id, revision))); }
      }
      for (const row of await rows('encyclopedia_command_receipts')) if (owned('encyclopedia_command_receipts', row)) ok(await request('DELETE', `/rest/v1/encyclopedia_command_receipts?actor_user_id=eq.${row.actor_user_id}&command_id=eq.${row.command_id}&entry_id=eq.${row.entry_id}`));
      for (const row of await rows('encyclopedia_entry_state')) if (owned('encyclopedia_entry_state', row)) { assert.ok(row.deleted && row.content_document === null); ok(await request('DELETE', `/rest/v1/encyclopedia_entry_state?entry_id=eq.${row.entry_id}&deleted=eq.true`)); }
      for (const id of state.grantedEditors) { assert.ok(state.accountIds.includes(id) && !before.encyclopedia_editors.some(r => r.user_id === id)); ok(await request('DELETE', `/rest/v1/encyclopedia_editors?user_id=eq.${id}`)); }
      await verify(); for (const table of tables) assert.ok(!(await rows(table)).some(r => owned(table, r)), 'Synthetic library cleanup remains');
      state.phase = 'cleaned'; await save();
    } catch (error) { state.phase = 'cleanup_failed'; await save(); throw error; }
  }
  return { a, b, anon, request, rpc, ok, rows, grant, revoke, newEntry, command, edge, verify, cleanup, deleteEditorAfterUI, manifest: manifest.pathname };
}
