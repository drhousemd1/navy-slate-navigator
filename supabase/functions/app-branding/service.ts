import { MediaError, validateImage } from '../message-media/validation.ts';
export { MediaError };
export const MAX_LOGO_BYTES = 10 * 1024 * 1024;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const DEFAULT_VERSION = '00000000-0000-4000-8000-000000000001';
export type Config = { supabaseUrl: string; anonKey: string; serviceKey: string };
const statuses: Record<string, number> = { BRANDING_OWNER_REQUIRED: 403, ACCOUNT_UNAVAILABLE: 403, INVALID_INPUT: 400,
  LOGO_NOT_FOUND: 404, LOGO_REVISION_CONFLICT: 409, COMMAND_ID_REUSED: 409, LOGO_OBJECT_UNVERIFIED: 409 };
export async function readBytes(body: ReadableStream<Uint8Array> | null, limit: number, signal: AbortSignal) {
  if (!body) throw new MediaError('INVALID_INPUT');
  const reader = body.getReader(), parts: Uint8Array[] = []; let length = 0;
  let abort: () => void = () => {};
  const cancelled = new Promise<never>((_, reject) => { abort = () => { void reader.cancel().catch(() => {}); reject(new MediaError('SAVE_UNCONFIRMED', 503)); }; });
  if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
  try {
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), cancelled]);
      if (signal.aborted) throw new MediaError('SAVE_UNCONFIRMED', 503);
      if (done) break;
      length += value.length;
      if (length > limit) { void reader.cancel().catch(() => {}); throw new MediaError('IMAGE_SIZE_INVALID', 413); }
      parts.push(value);
    }
  } finally { signal.removeEventListener('abort', abort); reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0; for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return bytes;
}
export function createService(config: Config, fetcher: typeof fetch, signal: AbortSignal) {
  const base = new URL(config.supabaseUrl);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== '/') throw new MediaError('SAVE_UNCONFIRMED', 503);
  const headers = { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}` };
  const request = (path: string, init: RequestInit) => fetcher(new URL(path, base), { ...init, redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
  const rpc = async (name: string, body: unknown) => {
    const r = await request(`/rest/v1/rpc/${name}`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const value = await r.json().catch(() => null);
    if (!r.ok) throw new MediaError(statuses[value?.message] ? value.message : 'SAVE_UNCONFIRMED', statuses[value?.message] ?? 503);
    return value;
  };
  async function verifyObject(path: string, expected: { mimeType: string; byteSize: number; sha256: string }) {
    const response = await request(`/storage/v1/object/authenticated/app-branding/${path}`, { headers });
    if (!response.ok) throw new MediaError('LOGO_OBJECT_UNVERIFIED', 409);
    const actual = await validateImage(await readBytes(response.body, MAX_LOGO_BYTES, signal), expected.mimeType, MAX_LOGO_BYTES);
    if (actual.sha256 !== expected.sha256 || actual.byteSize !== expected.byteSize) throw new MediaError('LOGO_OBJECT_UNVERIFIED', 409);
  }
  return {
    async actor(authorization: string | null) {
      if (!authorization?.startsWith('Bearer ') || [config.anonKey, config.serviceKey, ''].includes(authorization.slice(7))) throw new MediaError('AUTHENTICATION_REQUIRED', 401);
      const r = await request('/auth/v1/user', { headers: { apikey: config.anonKey, Authorization: authorization } });
      if (r.status >= 500) throw new MediaError('SAVE_UNCONFIRMED', 503);
      const value = r.ok ? await r.json().catch(() => null) : null;
      if (!UUID.test(value?.id ?? '')) throw new MediaError('AUTHENTICATION_REQUIRED', 401);
      return value.id as string;
    },
    checkOwner: (actor: string) => rpc('branding_check_owner', { p_actor: actor }),
    async upload(commandId: string, bytes: Uint8Array, mime: string) {
      if (commandId === DEFAULT_VERSION) throw new MediaError('INVALID_INPUT');
      if (!['image/png','image/jpeg','image/webp'].includes(mime)) throw new MediaError('IMAGE_TYPE_UNSUPPORTED');
      const metadata = await validateImage(bytes, mime, MAX_LOGO_BYTES);
      const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[mime];
      const path = `versions/${commandId}/${metadata.sha256}.${ext}`;
      const response = await request(`/storage/v1/object/app-branding/${path}`, { method: 'POST', headers: { ...headers, 'Content-Type': mime, 'x-upsert': 'false', 'cache-control': '31536000' }, body: new Uint8Array(bytes).buffer });
      // A retry may find the immutable object from an unconfirmed first attempt.
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        if (![409,400].includes(response.status) || !['Duplicate','Asset Already Exists'].includes(error?.error ?? error?.message)) throw new MediaError('SAVE_UNCONFIRMED', 503);
      }
      await verifyObject(path, metadata);
      return { ...metadata, objectPath: path };
    },
    async verifyVersion(actor: string, versionId: string) {
      const v = await rpc('branding_get_version', { p_actor: actor, p_version_id: versionId });
      if (v?.id !== versionId) throw new MediaError('SAVE_UNCONFIRMED', 503);
      if (versionId === DEFAULT_VERSION && v.objectPath === null && v.mimeType === null && v.sha256 === null && v.byteSize === null) return;
      const ext: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
      if (!ext[v.mimeType] || !/^[0-9a-f]{64}$/.test(v.sha256 ?? '') || !Number.isSafeInteger(v.byteSize) || v.byteSize < 1 || v.byteSize > MAX_LOGO_BYTES ||
        v.objectPath !== `versions/${versionId}/${v.sha256}.${ext[v.mimeType]}`) throw new MediaError('LOGO_OBJECT_UNVERIFIED', 409);
      await verifyObject(v.objectPath, v);
    },
    async commit(actor: string, commandId: string, expectedRevision: number, versionId: string, upload: unknown) {
      const r = await rpc('branding_commit', { p_actor: actor, p_command_id: commandId, p_expected_revision: expectedRevision, p_version_id: versionId, p_upload: upload });
      if (r?.commandId !== commandId || r.versionId !== versionId || r.revision !== expectedRevision + 1 || typeof r.replayed !== 'boolean') throw new MediaError('SAVE_UNCONFIRMED', 503);
      return { commandId: r.commandId, versionId: r.versionId, revision: r.revision, replayed: r.replayed };
    },
  };
}
