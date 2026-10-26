/**
 * Parent-run only after reviewing/applying 20261027011000_timezone_initialization.sql.
 * OBEDIENCE_LOCAL_STATUS_FILE=/absolute/private/status.private.json \
 *   node --test tests/backend/timezone-api.test.mjs
 * Creates and removes only synthetic accounts; never applies migrations.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';

const statusFile = process.env.OBEDIENCE_LOCAL_STATUS_FILE;
test('timezone initialization preserves saved values and current-account ownership', {
  skip: statusFile ? false : 'Requires parent-reviewed local migration application and private runtime status.',
  timeout: 90_000,
}, async () => {
  assert.ok(statusFile.startsWith('/'));
  const runtime = JSON.parse(await readFile(statusFile, 'utf8'));
  assert.equal(runtime.runtime, 'native');
  assert.equal(runtime.env.API_URL, 'http://127.0.0.1:28622');
  assert.equal(new URL(runtime.env.DB_URL).hostname, '127.0.0.1');
  assert.equal(new URL(runtime.env.DB_URL).port, '20324');
  const api = runtime.env.API_URL;
  const anon = runtime.env.ANON_KEY;
  const service = runtime.env.SERVICE_ROLE_KEY;
  const accounts = [];
  const periods = new Set();
  async function request(method, path, token = anon, body) {
    assert.match(path, /^\/(auth|rest)\/v1\//);
    const url = new URL(path, api); assert.equal(url.origin, api);
    const response = await fetch(url, { method, headers: { apikey: token === service ? service : anon,
      Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(12_000), redirect: 'error' });
    const text = await response.text();
    let data; try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    return { status: response.status, data };
  }
  const ok = result => { assert.ok(result.status >= 200 && result.status < 300, `API status ${result.status}; code ${result.data?.code ?? 'none'}`); return result.data; };
  const rpc = (account, name, body = {}) => request('POST', `/rest/v1/rpc/${name}`, account?.token ?? anon, body);
  const identity = async account => ok(await rpc(account, 'get_my_identity'));
  const initialProfiles = ok(await request('GET', '/rest/v1/profiles?select=*&order=id', service));
  async function account(role = 'dom') {
    const email = `timezone-${randomUUID()}@example.invalid`;
    const password = randomBytes(24).toString('base64url');
    const created = ok(await request('POST', '/auth/v1/admin/users', service, { email, password, email_confirm: true, user_metadata: role ? { role } : {} }));
    const item = { id: created.id, token: null }; accounts.push(item);
    const login = ok(await request('POST', '/auth/v1/token?grant_type=password', anon, { email, password }));
    item.token = login.access_token; assert.ok(item.token);
    const current = await identity(item); if (current.relationship_id) periods.add(current.relationship_id);
    return item;
  }
  try {
    const unauthenticated = await rpc(null, 'initialize_my_timezone', { p_timezone: 'UTC' });
    assert.notEqual(unauthenticated.status, 404, 'Apply the reviewed additive migration before running this test');
    assert.ok(unauthenticated.status >= 400);
    const a = await account(); const b = await account('sub'); const missing = await account(null);
    assert.equal((await identity(a)).timezone, null);
    const competing = await Promise.all(['America/Boise', 'Asia/Tokyo'].map(zone => rpc(a, 'initialize_my_timezone', { p_timezone: zone })));
    const values = competing.map(result => ok(result).timezone);
    assert.ok(['America/Boise', 'Asia/Tokyo'].includes(values[0]));
    assert.equal(values[0], values[1], 'Both initializers must return the single winning saved value');
    assert.equal(ok(await rpc(a, 'initialize_my_timezone', { p_timezone: 'Europe/London' })).timezone, values[0]);
    assert.equal((await identity(b)).timezone, null, 'Initializing A cannot alter B');
    assert.equal(ok(await rpc(b, 'initialize_my_timezone', { p_timezone: 'UTC' })).timezone, 'UTC');
    const invalid = await rpc(a, 'initialize_my_timezone', { p_timezone: 'Not/A_Timezone' });
    assert.ok(invalid.status >= 400); assert.equal(invalid.data?.message, 'INVALID_TIMEZONE');
    const noProfile = await rpc(missing, 'initialize_my_timezone', { p_timezone: 'UTC' });
    assert.ok(noProfile.status >= 400); assert.equal(noProfile.data?.message, 'PROFILE_SETUP_REQUIRED');
    ok(await rpc(a, 'set_my_timezone', { p_timezone: 'Europe/London' }));
    assert.equal(ok(await rpc(a, 'initialize_my_timezone', { p_timezone: 'America/Boise' })).timezone, 'Europe/London');
    assert.equal((await identity(b)).timezone, 'UTC');
    const c = await account();
    const explicitRace = await Promise.all([
      rpc(c, 'initialize_my_timezone', { p_timezone: 'America/Boise' }),
      rpc(c, 'set_my_timezone', { p_timezone: 'Europe/London' }),
    ]);
    explicitRace.forEach(ok);
    assert.equal((await identity(c)).timezone, 'Europe/London', 'Explicit saving wins regardless of initialization order');
  } finally {
    for (const item of accounts) {
      const contexts = ok(await request('GET', `/rest/v1/identity_contexts?select=relationship_id&user_id=eq.${item.id}`, service));
      for (const context of contexts) periods.add(context.relationship_id);
      ok(await request('DELETE', `/auth/v1/admin/users/${item.id}`, service));
    }
    for (const period of periods) {
      ok(await request('DELETE', `/rest/v1/relationship_period_members?relationship_id=eq.${period}`, service));
      ok(await request('DELETE', `/rest/v1/relationship_periods?id=eq.${period}`, service));
    }
    const remaining = ok(await request('GET', '/rest/v1/profiles?select=*&order=id', service));
    assert.deepEqual(remaining, initialProfiles, 'Existing profiles must remain unchanged');
  }
});
