/** Private synthetic-only helper. No code executes on import. Parent invokes the
 * guarded harness after reviewing1400, configuring Edge and reserving runtime. */
import assert from 'node:assert/strict';
import { readFile, lstat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
const baseline = new URL('../../../planning/operations/baseline/', import.meta.url);
export const fixtureStateFile = new URL('real-app-browser-fixture.private.json', baseline);
export async function privateJson(path) {
  const stat = await lstat(path); assert.ok(stat.isFile() && !stat.isSymbolicLink()); assert.equal(stat.mode & 0o777, 0o600);
  return JSON.parse(await readFile(path, 'utf8'));
}
export async function fixtureCommand(mode) {
  const flags = { create: '--reviewed-create-and-activate', 'enable-lifecycle': '--reviewed-synthetic-lifecycle-only', cleanup: '--browser-verification-complete' };
  assert.ok(['create', 'enable-lifecycle', 'verify', 'cleanup'].includes(mode));
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [new URL('real-app-browser-fixture.mjs', baseline).pathname, mode, ...(flags[mode] ? [flags[mode]] : [])], { stdio: ['ignore', 'pipe', 'pipe'] });
    // Child output can contain local private evidence paths. Keep it out of TAP.
    child.stdout.resume(); child.stderr.resume(); child.once('error', () => reject(new Error(`Fixture ${mode} could not start`)));
    child.once('close', code => code === 0 ? resolve() : reject(new Error(`Fixture ${mode} failed; inspect private fixture evidence (${code})`)));
  });
}
export async function localFixtureEnvironment(statusFile, nativeStateFile) {
  const status = await privateJson(statusFile);
  assert.equal(status.runtime, 'native'); assert.equal(status.env.API_URL, 'http://127.0.0.1:28622');
  const db = new URL(status.env.DB_URL); assert.equal(db.hostname, '127.0.0.1'); assert.equal(db.port, '20324');
  const { ANON_KEY: anon, SERVICE_ROLE_KEY: service } = status.env; assert.ok(anon && service);
  const native = await privateJson(nativeStateFile);
  assert.equal(native.credentials.serviceRoleKey, service); assert.equal(native.credentials.anonKey, anon);
  const secret = native.credentials.jwtSecret; assert.equal(typeof secret, 'string');
  const [header, payload, signature] = service.split('.'); assert.ok(header && payload && signature);
  assert.equal(createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url'), signature);
  const expectedFixture = await privateJson(fixtureStateFile).catch(() => null);
  if (expectedFixture) assert.equal(expectedFixture.phase, 'cleaned', 'Exclusive runtime requires previous browser fixture cleaned');
  const api = status.env.API_URL;
  const req = async (method, path, token = service, body, extraHeaders = {}) => {
    assert.match(path, /^\/(auth|rest|storage|functions)\/v1\//); const url = new URL(path, api); assert.equal(url.origin, api);
    const r = await fetch(url, { method, redirect: 'error', signal: AbortSignal.timeout(55000), headers: { apikey: token === service ? service : anon,
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      Prefer: 'return=representation', ...extraHeaders }, body: body === undefined ? undefined : body instanceof FormData || body instanceof Uint8Array ? body : JSON.stringify(body) });
    const bytes = new Uint8Array(await r.arrayBuffer()); let data = null;
    try { data = JSON.parse(new TextDecoder().decode(bytes)); } catch { /* binary */ }
    return { status: r.status, data, bytes };
  };
  const ok = r => { assert.ok(r.status >= 200 && r.status < 300, `Local request failed (${r.status}, ${r.data?.error?.code ?? r.data?.code ?? 'unknown'})`); return r.data; };
  const rows = async (table, filter = '') => {
    assert.match(table, /^[a-z_]+$/); const result = [];
    for (let offset = 0;; offset += 200) { const page = ok(await req('GET', `/rest/v1/${table}?select=*&limit=200&offset=${offset}${filter ? `&${filter}` : ''}`)); result.push(...page); if (page.length < 200) return result; }
  };
  const own = async id => { const state = await privateJson(fixtureStateFile); assert.ok(state.accounts.some(x => x.id === id)); assert.equal(state.api, api); return state; };
  const ownerToken = async id => {
    await own(id); const now = Math.floor(Date.now() / 1000), h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const p = Buffer.from(JSON.stringify({ role: 'service_role', sub: id, iss: 'supabase', aud: 'authenticated', iat: now, exp: now + 90 })).toString('base64url');
    return `${h}.${p}.${createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url')}`;
  };
  // SELECT-only proof of actual Storage ownership. Credentials stay in child env;
  // no SQL mutation, managed metadata edits, arbitrary SQL or private-row output.
  const storageMetadata = async (bucket, path) => {
    assert.ok(['message_images', 'message-media', 'avatars', 'rules', 'retained-account-media'].includes(bucket));
    assert.match(path, /^[a-zA-Z0-9_./-]+$/); assert.ok(!path.includes('..'));
    const result = await new Promise((resolve, reject) => {
      const env = { ...process.env, PGHOST: db.hostname, PGPORT: db.port, PGUSER: decodeURIComponent(db.username), PGPASSWORD: decodeURIComponent(db.password), PGDATABASE: decodeURIComponent(db.pathname.slice(1)) };
      const child = spawn(process.env.OBEDIENCE_PSQL_BINARY ?? 'psql', ['-X', '-A', '-t', '-q', '-v', 'ON_ERROR_STOP=1'], { env, stdio: ['pipe', 'pipe', 'pipe'] });
      let output = ''; child.stdout.on('data', x => output += x); child.stderr.resume();
      child.once('error', () => reject(new Error('Local read-only Storage metadata probe could not start')));
      child.once('close', code => code === 0 ? resolve(output.trim()) : reject(new Error('Local read-only Storage metadata probe failed')));
      child.stdin.end(`BEGIN READ ONLY; SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'owner',owner,'owner_id',owner_id,'version',version,'metadata',metadata)),'[]') FROM storage.objects WHERE bucket_id='${bucket}' AND name='${path}'; ROLLBACK;`);
    });
    return JSON.parse(result);
  };
  return { api, anon, service, req, ok, rows, own, ownerToken, storageMetadata };
}
