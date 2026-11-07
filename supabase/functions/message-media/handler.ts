import { MAX_IMAGE_BYTES, MediaError, validateImage } from './validation.ts';

type Config = { supabaseUrl: string; anonKey: string; serviceKey: string };
type Mapping = { attachmentId: string; bucket: string; objectPath: string; mimeType: string; byteSize: number; sha256: string; status?: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers = {
  'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};
const safeCodes = new Set(['AUTHENTICATION_REQUIRED', 'STALE_RELATIONSHIP', 'STALE_RELATIONSHIP_SESSION', 'VALID_IDENTITY_REQUIRED',
  'MESSAGE_PARTNER_REQUIRED', 'MESSAGE_MEDIA_INVALID', 'MESSAGE_UPLOAD_ID_REUSED', 'MESSAGE_ATTACHMENT_UNAVAILABLE', 'MESSAGE_UPLOAD_BUSY', 'ACCOUNT_UNAVAILABLE']);
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
async function boundedBytes(body: ReadableStream<Uint8Array> | null, limit: number) {
  if (!body) throw new MediaError('IMAGE_SIZE_INVALID');
  const reader = body.getReader(), chunks: Uint8Array[] = []; let length = 0;
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; length += value.length;
    if (length > limit) { await reader.cancel(); throw new MediaError('IMAGE_SIZE_INVALID', 413); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let at = 0; for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.length; } return bytes;
}
export function createMessageMediaHandler(config: Config, fetcher: typeof fetch = fetch) {
  const base = new URL(config.supabaseUrl);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== '/') throw new Error('Invalid backend configuration');
  return async (request: Request): Promise<Response> => {
  const operationSignal = AbortSignal.timeout(45_000);
  const internal = async (path: string, init: RequestInit) => {
    const target = new URL(path, base);
    if (target.origin !== base.origin || !/^\/(auth|rest|storage)\/v1\//.test(target.pathname)) throw new Error('Invalid backend path');
    operationSignal.throwIfAborted();
    return await fetcher(target, { ...init, signal: AbortSignal.any([operationSignal, AbortSignal.timeout(15_000)]), redirect: 'error' });
  };
  const serviceHeaders = { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}`, 'Content-Type': 'application/json' };
  const rpc = async (name: string, body: unknown) => {
    const response = await internal(`/rest/v1/rpc/${name}`, { method: 'POST', headers: serviceHeaders, body: JSON.stringify(body) });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new MediaError(safeCodes.has(data?.message) ? data.message : 'MEDIA_UNAVAILABLE', response.status >= 500 ? 503 : 403);
    return data;
  };
  const storagePath = (mapping: Mapping) => {
    if (!['message-media', 'message_images'].includes(mapping.bucket) || !mapping.objectPath || mapping.objectPath.split('/').some(s => !s || s === '.' || s === '..')) throw new MediaError('MEDIA_UNAVAILABLE', 503);
    return `/storage/v1/object/${mapping.bucket}/${mapping.objectPath.split('/').map(encodeURIComponent).join('/')}`;
  };
  const readObject = async (mapping: Mapping) => {
    const r = await internal(storagePath(mapping).replace('/storage/v1/object/', '/storage/v1/object/authenticated/'), { headers: serviceHeaders });
    if (!r.ok) throw new MediaError('MEDIA_UNAVAILABLE', 503);
    const bytes = await boundedBytes(r.body, MAX_IMAGE_BYTES);
    const sha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer)), x => x.toString(16).padStart(2, '0')).join('');
    if (bytes.length !== mapping.byteSize || sha !== mapping.sha256) throw new MediaError('MEDIA_INTEGRITY_FAILED', 503);
    return bytes;
  };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    try {
      const url = new URL(request.url), match = url.pathname.match(/^(?:\/functions\/v1)?\/message-media(?:\/([0-9a-f-]+))?\/?$/i);
      if (!match || url.search || !['GET', 'POST'].includes(request.method)) throw new MediaError('MEDIA_NOT_FOUND', 404);
      const authorization = request.headers.get('Authorization');
      if (!authorization?.startsWith('Bearer ') || authorization === `Bearer ${config.serviceKey}` || authorization === `Bearer ${config.anonKey}`)
        throw new MediaError('AUTHENTICATION_REQUIRED', 401);
      // Auth service verifies the user token. A service JWT is never user authentication.
      const auth = await internal('/auth/v1/user', { headers: { apikey: config.anonKey, Authorization: authorization } });
      const user = auth.ok ? await auth.json() : null;
      if (!user?.id || !uuid.test(user.id)) throw new MediaError('AUTHENTICATION_REQUIRED', 401);
      if (request.method === 'GET') {
        if (!match[1] || !uuid.test(match[1])) throw new MediaError('MEDIA_NOT_FOUND', 404);
        const mapping: Mapping = await rpc('message_media_read', { p_actor: user.id, p_attachment_id: match[1] });
        const bytes = await readObject(mapping);
        return new Response(bytes, { headers: { ...headers, 'Content-Type': mapping.mimeType, 'Content-Length': String(bytes.length),
          'Content-Disposition': 'inline; filename="message-image"' } });
      }
      if (match[1] || !request.headers.get('Content-Type')?.startsWith('multipart/form-data;')) throw new MediaError('UPLOAD_FORM_INVALID');
      const encoded = await boundedBytes(request.body, MAX_IMAGE_BYTES + 32 * 1024);
      let form: FormData;
      try { form = await new Response(encoded, { headers: { 'Content-Type': request.headers.get('Content-Type')! } }).formData(); }
      catch { throw new MediaError('UPLOAD_FORM_INVALID'); }
      const fields = ['uploadId', 'expectedRelationshipId', 'expectedRelationshipSessionId', 'file'];
      if ([...form.keys()].length !== 4 || fields.some(key => form.getAll(key).length !== 1)) throw new MediaError('UPLOAD_FORM_INVALID');
      const ids = fields.slice(0, 3).map(key => form.get(key));
      if (ids.some(value => typeof value !== 'string' || !uuid.test(value))) throw new MediaError('UPLOAD_FORM_INVALID');
      const file = form.get('file'); if (!(file instanceof File)) throw new MediaError('UPLOAD_FORM_INVALID');
      const bytes = new Uint8Array(await file.arrayBuffer()), verified = await validateImage(bytes, file.type);
      const mapping: Mapping = await rpc('message_media_begin', { p_actor: user.id, p_upload_id: ids[0], p_expected_relationship_id: ids[1],
        p_expected_relationship_session_id: ids[2], p_mime_type: verified.mimeType, p_byte_size: verified.byteSize, p_sha256: verified.sha256 });
      let uploadLease: string | undefined;
      if (mapping.status !== 'ready') {
        const claim = await rpc('message_media_claim_upload', { p_actor: user.id, p_attachment_id: mapping.attachmentId });
        if (claim.upload) {
        if (!uuid.test(claim.leaseToken)) throw new MediaError('UPLOAD_UNCONFIRMED', 503);
        uploadLease = claim.leaseToken;
        const upload = await internal(storagePath(mapping), { method: 'POST', headers: { ...serviceHeaders, 'Content-Type': verified.mimeType,
          'x-upsert': 'false', 'cache-control': '0', 'x-metadata': btoa(JSON.stringify({ uploadLeaseToken: uploadLease })) }, body: bytes });
        if (!upload.ok) {
          const error = await upload.json().catch(() => null);
          if (![409, 400].includes(upload.status) || !['Duplicate', '409'].includes(String(error?.error ?? error?.statusCode)))
            throw new MediaError('UPLOAD_UNCONFIRMED', 503);
          // Same-ID retry after a lost Storage response: verify existing bytes, never overwrite.
        }
      }
      }
      await readObject(mapping); // Includes retries and verifies persisted bytes before readiness.
      if (uploadLease) await rpc('message_media_settle_upload', { p_actor: user.id, p_attachment_id: mapping.attachmentId, p_lease_token: uploadLease });
      const ready = await rpc('message_media_finalize', { p_actor: user.id, p_attachment_id: mapping.attachmentId, p_sha256: verified.sha256 });
      // Failure/uncertainty leaves private pending bytes; no destructive rollback or public fallback.
      return json({ attachmentId: ready.attachmentId, mimeType: ready.mimeType, byteSize: ready.byteSize, status: 'ready' });
    } catch (error) {
      const e = error instanceof MediaError ? error : new MediaError('MEDIA_UNAVAILABLE', 503);
      const message = e.code === 'IMAGE_TYPE_UNSUPPORTED' ? 'Use a JPEG, PNG, GIF or WebP image.' : e.code === 'IMAGE_SIZE_INVALID' ? 'Choose an image no larger than 5 MiB.' : e.code;
      return json({ error: { code: e.code, message } }, e.status);
    }
  };
}
