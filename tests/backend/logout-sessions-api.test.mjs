/** Prepared only. Parent supplies the existing ready two-account browser fixture.
 * Auth-only: signs in synthetic sessions, revokes captured A1 with scope=local,
 * and checks refresh isolation. No account creation, cleanup, SQL or Storage.
 * Tokens stay in memory. Parent's fixture helper later removes these accounts.
 * This does not exercise browser storage, SDK cache, locks or UI notifications.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, lstat } from 'node:fs/promises';

const enabled = process.env.OBEDIENCE_LOGOUT_SESSIONS_REVIEWED === '1';
const baseline = new URL('../../../planning/operations/baseline/', import.meta.url);
const api = 'http://127.0.0.1:28622';
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);

async function privateJson(url) {
  const info = await lstat(url);
  assert.ok(info.isFile() && !info.isSymbolicLink() && (info.mode & 0o777) === 0o600, 'Expected a regular mode-600 private fixture file');
  try { return JSON.parse(await readFile(url, 'utf8')); }
  catch { throw new Error('Private fixture file could not be read'); }
}

test('captured A1 local logout revokes only A1; newer A2 and other-account B1 still refresh', {
  skip: enabled ? false : 'Prepared only: requires explicit reviewed flag and exclusive ready local browser fixture.',
  timeout: 180000,
}, async () => {
  // No private files are read until the explicit execution guard is enabled.
  const runtime = await privateJson(new URL('../local-runtime/status.private.json', baseline));
  const fixture = await privateJson(new URL('real-app-browser-fixture.private.json', baseline));
  const before = await privateJson(new URL('real-app-browser-before.private.json', baseline));
  assert.ok(runtime.runtime === 'native' && runtime.env?.API_URL === api, 'Pinned native API is required');
  let database;
  try { database = new URL(runtime.env.DB_URL); } catch { throw new Error('Pinned native database is required'); }
  assert.ok(database.hostname === '127.0.0.1' && database.port === '20324', 'Pinned native database is required');
  assert.ok(fixture.version === 1 && uuid(fixture.runId) && fixture.phase === 'ready', 'A ready recorded browser fixture is required');
  assert.ok(fixture.api === api && fixture.databasePort === '20324' && before.api === api && before.databasePort === '20324', 'Fixture backend identity differs');
  assert.ok(Array.isArray(before.authIds) && before.authIds.every(uuid), 'Original Auth exclusion list is required');
  assert.ok(Array.isArray(fixture.accounts) && fixture.accounts.length === 2, 'Expected exactly two recorded synthetic accounts');
  assert.ok(new Set(fixture.accounts.map(account => account.role)).size === 2 && new Set(fixture.accounts.map(account => account.id)).size === 2, 'Fixture account identities must be distinct');
  for (const account of fixture.accounts) {
    assert.ok(['dom', 'sub'].includes(account.role) && uuid(account.id) && !before.authIds.includes(account.id), 'Only recorded new synthetic accounts are allowed');
    assert.ok(account.email === `obedience-browser-${fixture.runId}-${account.role}@example.invalid`, 'Synthetic account run prefix differs');
    assert.ok(typeof account.password === 'string' && account.password.length > 0, 'Synthetic sign-in credential is unavailable');
  }
  const accountA = fixture.accounts.find(account => account.role === 'dom');
  const accountB = fixture.accounts.find(account => account.role === 'sub');
  const anon = runtime.env.ANON_KEY;
  assert.ok(typeof anon === 'string' && anon.length > 0, 'Local anonymous API key is unavailable');

  async function auth(path, body, bearer = anon) {
    assert.ok(['/token?grant_type=password', '/token?grant_type=refresh_token', '/logout?scope=local'].includes(path), 'Unexpected Auth operation');
    let response, data;
    try {
      response = await fetch(`${api}/auth/v1${path}`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
        headers: { apikey: anon, Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch { throw new Error('Local Auth request failed without a confirmed response'); }
    return { status: response.status, data };
  }
  function session(result, account, priorSessionId) {
    assert.ok(result.status === 200 && result.data?.user?.id === account.id && result.data?.user?.email === account.email, 'Auth response did not identify the exact synthetic account');
    const { access_token, refresh_token } = result.data;
    assert.ok(typeof access_token === 'string' && typeof refresh_token === 'string' && refresh_token.length > 0, 'Auth session credentials are unavailable');
    let claims;
    try { claims = JSON.parse(Buffer.from(access_token.split('.')[1], 'base64url').toString('utf8')); }
    catch { throw new Error('Auth session ownership could not be checked'); }
    // Claims identify a returned session; the Auth server remains the authority.
    assert.ok(claims.sub === account.id && uuid(claims.session_id), 'Auth session ownership differs');
    assert.ok(priorSessionId === undefined || claims.session_id === priorSessionId, 'Refresh replaced an unexpected session');
    return { accessToken: access_token, refreshToken: refresh_token, sessionId: claims.session_id };
  }
  const signIn = async account => session(await auth('/token?grant_type=password', { email: account.email, password: account.password }), account);
  const refresh = async (captured, account) => session(await auth('/token?grant_type=refresh_token', { refresh_token: captured.refreshToken }), account, captured.sessionId);

  let a1 = await signIn(accountA);
  a1 = await refresh(a1, accountA); // Establish that this exact session can refresh before logout.
  const a2 = await signIn(accountA);
  const b1 = await signIn(accountB);
  assert.ok(new Set([a1.sessionId, a2.sessionId, b1.sessionId]).size === 3, 'Expected three distinct synthetic sessions');

  // Matches installed GoTrueAdminApi.signOut(capturedJwt, 'local'). No mutable
  // SDK session is consulted after A2 and B1 have been created.
  const logout = await auth('/logout?scope=local', undefined, a1.accessToken);
  assert.ok(logout.status === 204, 'Captured-session local logout was not confirmed');
  const rejected = await auth('/token?grant_type=refresh_token', { refresh_token: a1.refreshToken });
  assert.ok([400, 401].includes(rejected.status) && ['refresh_token_not_found', 'refresh_token_already_used', 'session_not_found'].includes(rejected.data?.error_code), 'Revoked A1 refresh was not explicitly rejected');
  await refresh(a2, accountA);
  await refresh(b1, accountB);
  // No automatic cleanup: parent owns the fixture and its later account cleanup.
});
