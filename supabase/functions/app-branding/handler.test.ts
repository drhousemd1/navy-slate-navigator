import { createBrandingHandler } from './handler.ts';
import { validateImage, MAX_IMAGE_BYTES, MediaError } from '../message-media/validation.ts';
import { MAX_LOGO_BYTES, DEFAULT_VERSION } from './service.ts';
const assert = (value: unknown, message = 'assertion failed') => { if (!value) throw new Error(message); };
const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg=='), c => c.charCodeAt(0));
const actor = '11111111-1111-4111-8111-111111111111', command = '22222222-2222-4222-8222-222222222222';
const base = 'http://127.0.0.1:28622';
const response = (data: unknown, status = 200) => Response.json(data, { status });
function fixture(failure = '', duplicate = false) {
  const calls: string[] = []; const commits: Record<string, unknown>[] = []; let storedPath = '';
  const handler = createBrandingHandler({ supabaseUrl: base, anonKey: 'anon', serviceKey: 'service' }, async (url, init) => {
    const u = new URL(String(url)); calls.push(u.pathname);
    assert(u.origin === base && init?.redirect === 'error' && init.signal instanceof AbortSignal);
    if (u.pathname === '/auth/v1/user') return response({ id: actor });
    if (u.pathname.endsWith('/branding_check_owner')) return failure === 'owner' ? response({ message: 'BRANDING_OWNER_REQUIRED' }, 403) : response(null);
    if (u.pathname.endsWith('/branding_get_version')) {
      const { p_version_id } = JSON.parse(String(init?.body)); const metadata = await validateImage(png, 'image/png');
      return response(p_version_id === DEFAULT_VERSION ? { id: p_version_id, objectPath: null, mimeType: null, byteSize: null, sha256: null } :
        { id: p_version_id, ...metadata, objectPath: failure === 'path' ? '../../private/image' : `versions/${p_version_id}/${metadata.sha256}.png` });
    }
    if (u.pathname.startsWith('/storage/v1/object/authenticated/')) return failure === 'missing' ? response({}, 404) : new Response(failure === 'corrupt' ? new Uint8Array([1,2,3]) : png);
    if (u.pathname.startsWith('/storage/v1/object/app-branding/')) {
      assert(init?.method === 'POST' && (init.headers as Record<string, string>)['x-upsert'] === 'false');
      assert(new Uint8Array(init?.body as ArrayBuffer).every((byte, i) => byte === png[i])); storedPath = u.pathname;
      return failure === 'storage' ? response({}, 503) : duplicate ? response({ error: 'Duplicate' }, 400) : response({});
    }
    assert(u.pathname.endsWith('/branding_commit'));
    const body = JSON.parse(String(init?.body)); assert(body.p_actor === actor); commits.push(body);
    if (failure === 'revoked') return response({ message: 'BRANDING_OWNER_REQUIRED' }, 403);
    if (failure === 'conflict') return response({ message: 'LOGO_REVISION_CONFLICT' }, 400);
    if (failure === 'network') throw new Error('private SQL details');
    return response({ commandId: body.p_command_id, versionId: body.p_version_id, revision: body.p_expected_revision + 1, replayed: duplicate, privateField: 'not public' });
  });
  const invoke = (route = 'upload', body: BodyInit = png, token = 'user', mime = 'image/png') => handler(new Request(`${base}/functions/v1/app-branding/${route}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': mime, 'x-command-id': command, 'x-expected-revision': '0' }, body,
  }));
  return { invoke, calls, commits, get storedPath() { return storedPath; } };
}
Deno.test('owner upload verifies immutable bytes and commits captured actor/metadata without leaking service output', async () => {
  const f = fixture(), result = await f.invoke(), body = await result.json();
  assert(result.status === 200 && body.commandId === command && body.privateField === undefined);
  const meta = await validateImage(png, 'image/png');
  assert(f.storedPath === `/storage/v1/object/app-branding/versions/${command}/${meta.sha256}.png`);
  assert(f.commits[0].p_expected_revision === 0 && f.commits[0].p_version_id === command);
  assert(JSON.stringify(f.commits[0].p_upload) === JSON.stringify({ ...meta, objectPath: `versions/${command}/${meta.sha256}.png` }));
});
Deno.test('anonymous/service tokens and nonowners cannot reach image validation or storage', async () => {
  for (const token of ['', 'anon', 'service']) { const f = fixture(); assert((await f.invoke('upload', png, token)).status === 401 && f.calls.length === 0); }
  const f = fixture('owner'); assert((await f.invoke('upload', '<svg/>', 'user', 'image/svg+xml')).status === 403 && f.calls.length === 2);
});
Deno.test('SVG, MIME mismatch, empty/oversized bytes and bad route never publish', async () => {
  for (const [body, mime, status] of [[new TextEncoder().encode('<svg/>'), 'image/svg+xml',400], [png, 'image/jpeg',400], [new Uint8Array(), 'image/png',400], [new Uint8Array(MAX_LOGO_BYTES + 1), 'image/png',413]] as const) {
    const f = fixture(); assert((await f.invoke('upload', body, 'user', mime)).status === status); assert(f.commits.length === 0 && !f.storedPath);
  }
  const f = fixture(); assert((await f.invoke('upload?path=private')).status === 400 && f.calls.length === 0);
});
Deno.test('retry verifies an existing immutable object before replay, and corruption cannot commit', async () => {
  const f = fixture('', true); assert((await f.invoke()).status === 200 && f.commits.length === 1);
  for (const reason of ['corrupt', 'missing', 'storage']) { const bad = fixture(reason); assert((await bad.invoke()).status !== 200 && bad.commits.length === 0); }
});
Deno.test('restore accepts only version ID, verifies exact archived bytes, and supports built-in default', async () => {
  for (const id of [command, DEFAULT_VERSION]) {
    const f = fixture(), r = await f.invoke('restore', JSON.stringify({ versionId: id }), 'user', 'application/json');
    assert(r.status === 200 && f.commits[0].p_upload === null && f.commits[0].p_version_id === id && !f.storedPath);
    assert(f.calls.filter(path => path.startsWith('/storage/')).length === (id === DEFAULT_VERSION ? 0 : 1));
  }
  const forged = fixture(); assert((await forged.invoke('restore', JSON.stringify({ versionId: command, url: 'https://elsewhere.example/private' }), 'user', 'application/json')).status === 400 && forged.commits.length === 0);
  for (const failure of ['path', 'corrupt', 'missing']) { const f = fixture(failure); assert((await f.invoke('restore', JSON.stringify({ versionId: command }), 'user', 'application/json')).status !== 200 && f.commits.length === 0); }
});
Deno.test('commit-time revocation/conflict remain explicit and unknown errors stay unconfirmed', async () => {
  for (const [failure, status, code] of [['revoked',403,'BRANDING_OWNER_REQUIRED'],['conflict',409,'LOGO_REVISION_CONFLICT'],['network',503,'SAVE_UNCONFIRMED']] as const) {
    const result = await fixture(failure).invoke(); assert(result.status === status);
    const text = await result.text(); assert(text.includes(code) && !text.includes('private SQL details'));
  }
});
Deno.test('logo 10 MiB opt-in does not weaken the existing 5 MiB message/Encyclopedia limit', async () => {
  // A valid PNG ancillary text chunk enlarges an existing real 1px image without
  // changing its pixels. This still proves container validation, not pixel decode.
  const size = MAX_IMAGE_BYTES, chunk = new Uint8Array(size + 12), view = new DataView(chunk.buffer);
  view.setUint32(0, size); chunk.set(new TextEncoder().encode('tEXt'), 4); chunk[8] = 65;
  let crc = 0xffffffff;
  for (const byte of chunk.subarray(4, size + 8)) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  view.setUint32(size + 8, (crc ^ 0xffffffff) >>> 0);
  const large = new Uint8Array(png.length + chunk.length); large.set(png.subarray(0,33)); large.set(chunk,33); large.set(png.subarray(33),33+chunk.length);
  let rejected = false;
  try { await validateImage(large, 'image/png'); } catch (e) { rejected = e instanceof MediaError && e.code === 'IMAGE_SIZE_INVALID'; }
  assert(rejected); assert((await validateImage(large, 'image/png', MAX_LOGO_BYTES)).byteSize === large.length);
  try { await validateImage(new Uint8Array(MAX_LOGO_BYTES + 1), 'image/png', MAX_LOGO_BYTES); throw new Error('accepted oversized logo'); }
  catch (e) { assert(e instanceof MediaError && e.code === 'IMAGE_SIZE_INVALID'); }
});
