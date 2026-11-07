import { createAccountDeletionHandler } from './handler.ts';
const id = '11111111-1111-4111-8111-111111111111';
const actor = '22222222-2222-4222-8222-222222222222';
const lease = '33333333-3333-4333-8333-333333333333';
const object = '44444444-4444-4444-8444-444444444444';
const capability = 'A'.repeat(43), base = 'http://127.0.0.1:28622';
const payload = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
const sha = async (bytes: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer)), x => x.toString(16).padStart(2, '0')).join('');
function assert(condition: unknown, message = 'assertion failed'): asserts condition { if (!condition) throw new Error(message); }
function eq(actual: unknown, expected: unknown) { assert(JSON.stringify(actual) === JSON.stringify(expected), `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`); }
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
type FixtureOptions = { kind?: 'storage' | 'account'; disposition?: 'delete' | 'message' | 'archive'; switched?: boolean; unavailable?: boolean; busy?: boolean; missingAuth?: boolean; completed?: boolean; wrongTarget?: boolean; failAt?: string; failAfter?: boolean; failStart?: string; malformedWork?: boolean };
async function fixture(options: FixtureOptions = {}) {
  const calls: string[] = [], bodies: unknown[] = [];
  let source: Uint8Array | null = payload, target: Uint8Array | null = options.switched ? payload : null;
  let presentAuth = !options.missingAuth, completed = !!options.completed, switched = !!options.switched, failConsumed = false;
  let retry = false, downloadCount = 0;
  const status = () => ({ jobId: id, state: completed ? 'complete' : retry ? 'retry_required' : 'pending',
    phase: completed ? 'complete' : options.kind === 'account' ? 'account' : 'storage', retryAfterMs: completed ? 0 : 1500,
    completedAt: completed ? '2026-11-06T00:00:00Z' : null });
  const hash = await sha(payload);
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input)), name = url.pathname.split('/').pop()!;
    assert(url.origin === base, 'no external destination'); assert(init?.redirect === 'error'); assert(init?.signal instanceof AbortSignal);
    let key = url.pathname.startsWith('/rest/v1/rpc/') ? name : `${init?.method ?? 'GET'} ${url.pathname}`;
    if (key === 'GET /storage/v1/object/authenticated/message-media/target') key += ` #${++downloadCount}`;
    calls.push(key); bodies.push(init?.body);
    const fail = options.failAt === key && !failConsumed;
    if (fail && !options.failAfter) { failConsumed = true; throw new Error('private path and user identity must never leak'); }
    let result: Response;
    if (url.pathname === '/auth/v1/user') result = response({ id: actor });
    else if (url.pathname === '/rest/v1/account_deletion_jobs') result = response([{ recovery_hash: await sha(new TextEncoder().encode(capability)) }]);
    else if (url.pathname.startsWith('/rest/v1/rpc/')) {
      if (options.unavailable && ['account_deletion_status', 'claim_account_deletion'].includes(name)) result = response({ message: 'DELETION_UNAVAILABLE' }, 403);
      else if (name === 'begin_account_deletion') result = options.failStart ? response({ message: options.failStart }, 400) : response(status());
      else if (name === 'account_deletion_status') result = response(status());
      else if (name === 'claim_account_deletion') result = response({ status: status(), work: completed || options.busy ? null : options.kind === 'account'
        ? { kind: 'account', leaseToken: lease, actorUserId: presentAuth ? actor : null }
        : { kind: 'storage', leaseToken: lease, objectId: object, state: switched ? 'switched' : 'pending', disposition: options.disposition ?? 'message',
          sourceBucket: options.malformedWork ? '../auth' : 'message_images', sourcePath: 'source', targetBucket: 'message-media', targetPath: 'target', byteSize: payload.length, sha256: switched ? hash : null } });
      else if (name === 'switch_account_deletion_object') { switched = true; result = response(null); }
      else if (name === 'authorize_account_deletion_object_removal') { assert(options.disposition === 'delete' || switched); result = response(null); }
      else if (name === 'finish_account_deletion_object') { assert(!source); result = response(status()); }
      else if (name === 'finish_account_deletion') { assert(!presentAuth); completed = true; result = response(status()); }
      else if (name === 'fail_account_deletion') { retry = true; result = response(status()); }
      else throw new Error(`Unexpected RPC ${name}`);
    } else if (url.pathname.startsWith('/storage/v1/object/authenticated/')) {
      const value = name === 'source' ? source : target;
      result = value ? new Response(new Uint8Array(value), { headers: { 'Content-Type': 'image/png' } }) : response({ statusCode: '404' }, 400);
    } else if (url.pathname === '/storage/v1/object/message-media' || url.pathname === '/storage/v1/object/message-media/target') {
      assert(init?.method === 'POST'); target = options.wrongTarget ? new Uint8Array([9]) : new Uint8Array(init.body as Uint8Array); result = response({ Key: 'ignored' });
    } else if (url.pathname === '/storage/v1/object/message_images') {
      assert(init?.method === 'DELETE'); eq(JSON.parse(init.body as string), { prefixes: ['source'] }); source = null; result = response([]);
    } else if (url.pathname === `/auth/v1/admin/users/${actor}`) {
      if (init?.method === 'DELETE') { presentAuth = false; result = response({}); }
      else result = presentAuth ? response({ id: actor }) : response({ message: 'not found' }, 404);
    } else throw new Error(`Unexpected path ${url.pathname}`);
    if (fail) { failConsumed = true; throw new Error('lost response with private server data'); }
    return result;
  };
  const handler = createAccountDeletionHandler({ supabaseUrl: base, anonKey: 'public-key', serviceKey: 'service-key' }, fetcher);
  async function invoke(route = 'resume', input: unknown = { jobId: id, recoveryToken: capability }, authorization?: string) {
    const r = await handler(new Request(`${base}/functions/v1/account-deletion/${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}) }, body: JSON.stringify(input) }));
    const data = await r.json(); const serialized = JSON.stringify(data);
    for (const forbidden of [capability, actor, 'sourceBucket', 'sourcePath', 'leaseToken', 'private server']) assert(!serialized.includes(forbidden), 'private service payload leaked');
    return { code: r.status, data };
  }
  return { invoke, calls, bodies, get source() { return source; }, get target() { return target; }, get presentAuth() { return presentAuth; } };
}
const start = { commandId: id, expectedRelationshipId: actor, expectedRelationshipSessionId: lease, recoveryToken: capability };
Deno.test('start validates live Auth and prepares without Storage/Auth deletion', async () => {
  const f = await fixture(); eq((await f.invoke('start', start, 'Bearer real-user')).code, 202);
  eq(f.calls, ['GET /auth/v1/user', 'begin_account_deletion']);
  const body = JSON.parse(f.bodies[1] as string); assert(body.p_recovery_hash.length === 64 && !JSON.stringify(body).includes(capability));
});
Deno.test('start refuses service/anon/no bearer, extra fields and invalid token before I/O', async () => {
  for (const token of [undefined, 'Bearer service-key', 'Bearer public-key']) { const f = await fixture(); eq((await f.invoke('start', start, token)).code, 401); eq(f.calls.length, 0); }
  for (const input of [{ ...start, userId: actor }, { ...start, recoveryToken: 'bad' }]) { const f = await fixture(); eq((await f.invoke('start', input, 'Bearer real-user')).code, 400); eq(f.calls.length, 0); }
});
Deno.test('preparation rejection is an error, never a prepared state', async () => {
  for (const code of ['DELETION_BUSY', 'STALE_RELATIONSHIP', 'DELETION_COMMAND_ID_REUSED']) { const f = await fixture({ failStart: code }); const r = await f.invoke('start', start, 'Bearer real-user'); eq(r.code, 409); eq(r.data.error.code, code); assert(!r.data.state); }
});
Deno.test('wrong capability and unknown job expose generic unavailable only', async () => {
  const f = await fixture({ unavailable: true }); const r = await f.invoke('status'); eq(r.code, 404); eq(r.data.error.code, 'DELETION_UNAVAILABLE');
});
Deno.test('retained object bytes verified and atomically switched before removal', async () => {
  const f = await fixture(); const r = await f.invoke(); eq(r.data.state, 'pending'); eq(f.source, null); eq(Array.from(f.target!), Array.from(payload));
  assert(f.calls.indexOf('switch_account_deletion_object') < f.calls.indexOf('authorize_account_deletion_object_removal'));
  assert(f.calls.indexOf('authorize_account_deletion_object_removal') < f.calls.indexOf('DELETE /storage/v1/object/message_images'));
});
Deno.test('mismatched retained bytes never remove source', async () => { const f = await fixture({ wrongTarget: true }); eq((await f.invoke()).data.state, 'retry_required'); assert(f.source); assert(!f.calls.includes('switch_account_deletion_object')); });
for (const failAt of ['GET /storage/v1/object/authenticated/message-media/target #1', 'GET /storage/v1/object/authenticated/message_images/source', 'POST /storage/v1/object/message-media/target',
  'GET /storage/v1/object/authenticated/message-media/target #2', 'switch_account_deletion_object', 'authorize_account_deletion_object_removal', 'DELETE /storage/v1/object/message_images', 'finish_account_deletion_object']) {
  Deno.test(`external failure is resumable and private: ${failAt}`, async () => {
    const f = await fixture({ failAt }); const r = await f.invoke(); eq(r.code, 202); eq(r.data.state, 'retry_required'); assert(f.presentAuth);
    if (failAt !== 'finish_account_deletion_object') assert(f.source);
  });
}
Deno.test('lost source-delete response retries exact switched object safely', async () => {
  const f = await fixture({ failAt: 'DELETE /storage/v1/object/message_images', failAfter: true }); eq((await f.invoke()).data.state, 'retry_required'); eq(f.source, null);
  eq((await f.invoke()).code, 202); eq(f.calls.filter(x => x === 'switch_account_deletion_object').length, 1);
});
Deno.test('private-only bytes removed without copy', async () => { const f = await fixture({ disposition: 'delete' }); await f.invoke(); eq(f.source, null); eq(f.target, null); });
Deno.test('malformed internal source target cannot reach destructive request', async () => { const f = await fixture({ malformedWork: true }); eq((await f.invoke()).data.state, 'retry_required'); assert(!f.calls.some(x => x.startsWith('DELETE '))); });
Deno.test('active processing lease or completed job performs no external operation', async () => {
  for (const opts of [{ busy: true }, { completed: true }]) { const f = await fixture(opts); await f.invoke(); eq(f.calls, ['claim_account_deletion']); }
});
Deno.test('Auth removal last and confirmed by full job finalization', async () => { const f = await fixture({ kind: 'account' }); eq((await f.invoke()).data.state, 'complete'); eq(f.calls, ['claim_account_deletion', `DELETE /auth/v1/admin/users/${actor}`, `GET /auth/v1/admin/users/${actor}`, 'finish_account_deletion']); });
for (const failAt of [`DELETE /auth/v1/admin/users/${actor}`, `GET /auth/v1/admin/users/${actor}`, 'finish_account_deletion']) {
  Deno.test(`Auth boundary failure never reports success: ${failAt}`, async () => { const f = await fixture({ kind: 'account', failAt }); eq((await f.invoke()).data.state, 'retry_required'); eq((await f.invoke()).data.state, 'complete'); });
}
Deno.test('missing Auth alone is not success; service must finish prepared job', async () => { const f = await fixture({ kind: 'account', missingAuth: true, failAt: 'finish_account_deletion' }); eq((await f.invoke()).data.state, 'retry_required'); assert(f.calls.includes('finish_account_deletion')); });
Deno.test('service continuation requires exact service bearer and no client target', async () => {
  const f = await fixture({ completed: true }); eq((await f.invoke('continue', { jobId: id }, 'Bearer real-user')).code, 404); eq(f.calls.length, 0);
  eq((await f.invoke('continue', { jobId: id }, 'Bearer service-key')).data.state, 'complete');
});

Deno.test('slow request body is cancelled at operation deadline before backend I/O', async () => {
  const original = AbortSignal.timeout; let cancelled = false, calls = 0;
  const controller = new AbortController();
  AbortSignal.timeout = ms => ms === 45000 ? controller.signal : original(ms);
  try {
    const body = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
    const handler = createAccountDeletionHandler({ supabaseUrl: base, anonKey: 'public-key', serviceKey: 'service-key' }, async () => { calls++; throw new Error('Unexpected backend I/O'); });
    const result = handler(new Request(`${base}/functions/v1/account-deletion/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }));
    controller.abort();
    eq((await result).status, 400); assert(cancelled); eq(calls, 0);
  } finally { AbortSignal.timeout = original; }
});
