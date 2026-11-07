import { createEncyclopediaHandler } from './handler.ts';
import { MAX_BODY_BYTES } from './validation.ts';
const actor = '11111111-1111-4111-8111-111111111111', entry = '22222222-2222-4222-8222-222222222222', command = '33333333-3333-4333-8333-333333333333';
const base = 'http://127.0.0.1:28622';
const assert = (value: unknown) => { if (!value) throw new Error('assertion failed'); };
const input = { commandId: command, entryId: entry, expectedRevision: 0, patch: { title: 'Synthetic', subtext: '', contentDocument: { version: 1, blocks: [] } } };
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
function fixture(failure?: string) {
  const calls: string[] = []; let body: Record<string, unknown> | undefined;
  const handler = createEncyclopediaHandler({ supabaseUrl: base, anonKey: 'anon', serviceKey: 'service' }, async (url, init) => {
    const u = new URL(String(url)); assert(u.origin === base && init?.redirect === 'error' && init.signal instanceof AbortSignal); calls.push(u.pathname);
    if (failure === 'network') throw new Error('private credentials and original rows');
    if (u.pathname === '/auth/v1/user') return failure === 'auth' ? response({}, 401) : response({ id: actor });
    const parsed = JSON.parse(String(init?.body)); assert(parsed.p_actor === actor);
    if (u.pathname.endsWith('/encyclopedia_check_editor')) return failure === 'editor' ? response({ message: 'EDITOR_REQUIRED' }, 403) : response(null);
    assert(u.pathname.endsWith('/encyclopedia_commit')); body = parsed;
    if (failure === 'ENTRY_REVISION_CONFLICT') return response({ code: '40001', message: failure }, 500);
    if (failure) return response({ message: failure }, 400);
    return response({ entryId: parsed.p_entry_id, revision: parsed.p_expected_revision + 1, deleted: parsed.p_operation === 'delete', replayed: false, privateField: 'must not leak' });
  });
  const invoke = (value: unknown = input, token = 'real-user', route = 'save') => handler(new Request(`${base}/functions/v1/encyclopedia-admin/${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(value) }));
  return { invoke, handler, calls, get body() { return body; } };
}
Deno.test('handler pins live actor and projects compact save/delete result', async () => {
  const f = fixture(), r = await f.invoke(); assert(r.status === 200); const result = await r.json(); assert(result.entryId === entry && result.revision === 1 && result.privateField === undefined);
  assert(f.body?.p_actor === actor && f.body.p_command_id === command && f.calls.length === 3);
  assert((await f.invoke({ commandId: command, entryId: entry, expectedRevision: 1 }, 'real-user', 'delete')).status === 200);
});
Deno.test('anonymous/service bearers and ordinary users cannot reach validation/commit', async () => {
  for (const token of ['', 'anon', 'service']) { const f = fixture(); assert((await f.invoke(input, token)).status === 401 && f.calls.length === 0); }
  const f = fixture('editor'); assert((await f.invoke({ malformed: true })).status === 403 && f.calls.length === 2);
});
Deno.test('forged actor and malformed input cannot reach commit', async () => { const f = fixture(); assert((await f.invoke({ ...input, actorId: actor })).status === 400 && f.calls.length === 2); });
Deno.test('commit-time revocation, conflict and replay mismatch map only known errors', async () => {
  for (const [code, status] of [['EDITOR_REQUIRED', 403], ['ACCOUNT_UNAVAILABLE', 403], ['ENTRY_REVISION_CONFLICT', 409], ['ENTRY_NOT_FOUND', 404], ['COMMAND_ID_REUSED', 409], ['ENTRY_ID_REUSED', 409]] as const) {
    const r = await fixture(code).invoke(); assert(r.status === status && (await r.json()).error.code === code);
  }
});
Deno.test('unknown network/SQL failures never expose private details or claim success', async () => {
  for (const failure of ['network', 'private SQL detail']) { const r = await fixture(failure).invoke(); const body = await r.text(); assert(r.status === 503 && body.includes('SAVE_UNCONFIRMED') && !body.includes(failure)); }
});
Deno.test('oversized body is rejected and stalled body abort cancels the reader', async () => {
  const f = fixture(); assert((await f.invoke('a'.repeat(MAX_BODY_BYTES))).status === 413);
  const controller = new AbortController(); let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
  const pending = f.handler(new Request(`${base}/encyclopedia-admin/save`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer real-user' }, body: stream, signal: controller.signal }));
  await new Promise(resolve => setTimeout(resolve, 5)); controller.abort();
  assert((await pending).status === 503 && cancelled);
});
