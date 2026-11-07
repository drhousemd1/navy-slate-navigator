type Config = { supabaseUrl: string; anonKey: string; serviceKey: string };
type Status = { jobId: string; state: 'pending' | 'retry_required' | 'complete'; phase: 'storage' | 'account' | 'complete'; retryAfterMs: number; completedAt: string | null };
type Work = { kind: 'storage' | 'account'; leaseToken: string; actorUserId?: string | null; objectId?: string;
  state?: 'pending' | 'switched'; disposition?: 'delete' | 'message' | 'archive'; sourceBucket?: string; sourcePath?: string;
  targetBucket?: string; targetPath?: string; mimeType?: string; byteSize?: number; sha256?: string | null };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const MAX_BYTES = 64 * 1024 * 1024;
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
class Failure extends Error { constructor(readonly code: string, readonly status = 503) { super(code); } }
const messages: Record<string, string> = {
  AUTHENTICATION_REQUIRED: 'Sign in again before requesting account deletion.',
  INVALID_DELETION_REQUEST: 'The deletion request could not be verified.',
  DELETION_UNAVAILABLE: 'That deletion request is unavailable.',
  DELETION_BUSY: 'A connected account is already being removed. Refresh your connection and retry later.',
  DELETION_COMMAND_ID_REUSED: 'This saved deletion request does not match its original confirmation.',
  STALE_RELATIONSHIP: 'Your connection changed. Refresh it before confirming deletion.',
  STALE_RELATIONSHIP_SESSION: 'Your connection changed. Refresh it before confirming deletion.',
  VALID_IDENTITY_REQUIRED: 'Your account connection must be repaired before deletion can start.',
  ACCOUNT_UNAVAILABLE: 'This account is unavailable.',
  LIFECYCLE_INTEGRATION_REQUIRED: 'Account deletion is not yet enabled for this account.',
  LIFECYCLE_ACCOUNTING_INTEGRATION_REQUIRED: 'Account deletion is not yet enabled for this account.',
  DELETION_REFERENCE_REVIEW_REQUIRED: 'Some retained data needs review before this account can be removed.',
  DELETION_UNCONFIRMED: 'Deletion could not be confirmed. Keep this saved request and check its status before retrying.',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
async function bytes(body: ReadableStream<Uint8Array> | null, limit: number, signal?: AbortSignal) {
  if (!body) return new Uint8Array();
  const reader = body.getReader(), parts: Uint8Array[] = []; let size = 0;
  let abort: (() => void) | undefined;
  const cancelled = new Promise<never>((_, reject) => { abort = () => { void reader.cancel().catch(() => {}); reject(new Failure('DELETION_UNCONFIRMED')); };
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true }); });
  try { for (;;) { const { done, value } = await Promise.race([reader.read(), cancelled]); if (done) break; size += value.length;
    if (size > limit) { await reader.cancel(); throw new Failure('DELETION_UNCONFIRMED'); } parts.push(value); }
  } finally { if (abort) signal?.removeEventListener('abort', abort); reader.releaseLock(); }
  const result = new Uint8Array(size); let offset = 0; for (const part of parts) { result.set(part, offset); offset += part.length; } return result;
}
const digest = async (value: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(value).buffer)), x => x.toString(16).padStart(2, '0')).join('');
function exact(value: unknown, keys: string[]): value is Record<string, string> {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',') &&
    Object.values(value).every(x => typeof x === 'string');
}
function status(value: Status): Status {
  if (!value || !uuid.test(value.jobId) || !['pending', 'retry_required', 'complete'].includes(value.state) ||
    !['storage', 'account', 'complete'].includes(value.phase) || !Number.isSafeInteger(value.retryAfterMs) || value.retryAfterMs < 0 ||
    (value.state === 'complete') !== (value.phase === 'complete') || (value.state === 'complete' ? typeof value.completedAt !== 'string' || !Number.isFinite(Date.parse(value.completedAt)) : value.completedAt !== null)) throw new Failure('DELETION_UNCONFIRMED');
  // Explicit projection never returns service work, object paths or capability.
  return { jobId: value.jobId, state: value.state, phase: value.phase, retryAfterMs: value.retryAfterMs, completedAt: value.completedAt };
}
export function createAccountDeletionHandler(config: Config, fetcher: typeof fetch = fetch) {
  const base = new URL(config.supabaseUrl);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== '/') throw new Error('Invalid backend configuration');
  const serviceHeaders = { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}`, 'Content-Type': 'application/json' };
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    let jobId: string | undefined, recoveryHash: string | undefined, lease: string | undefined;
    const operationSignal = AbortSignal.timeout(45_000);
    const internal = (path: string, init: RequestInit) => {
      const target = new URL(path, base);
      if (target.origin !== base.origin || !/^\/(auth|rest|storage)\/v1\//.test(target.pathname)) throw new Failure('DELETION_UNCONFIRMED');
      return fetcher(target, { ...init, redirect: 'error', signal: AbortSignal.any([operationSignal, AbortSignal.timeout(15_000)]) });
    };
    const rpc = async (name: string, body: unknown) => {
      const response = await internal(`/rest/v1/rpc/${name}`, { method: 'POST', headers: serviceHeaders, body: JSON.stringify(body) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Failure(messages[data?.message] ? data.message : 'DELETION_UNCONFIRMED', data?.message === 'DELETION_UNAVAILABLE' ? 404 : response.status >= 500 ? 503 : 409);
      return data;
    };
    const objectPath = (bucket: string | undefined, path: string | undefined) => {
      if (!bucket || !/^[a-zA-Z0-9_-]+$/.test(bucket) || !path || path.split('/').some(x => !x || x === '.' || x === '..')) throw new Failure('DELETION_UNCONFIRMED');
      return `${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`;
    };
    const download = async (bucket: string | undefined, path: string | undefined, missing = false) => {
      const response = await internal(`/storage/v1/object/authenticated/${objectPath(bucket, path)}`, { headers: serviceHeaders });
      if (missing && response.status === 404) return null;
      if (!response.ok) {
        // Pinned Storage may encode a missing object as HTTP 400 + statusCode404.
        const error = await response.json().catch(() => null);
        if (missing && (response.status === 400 && String(error?.statusCode) === '404')) return null;
        throw new Failure('DELETION_UNCONFIRMED');
      }
      return { bytes: await bytes(response.body, MAX_BYTES, operationSignal), mimeType: response.headers.get('Content-Type')?.split(';')[0] ?? null };
    };
    try {
      const url = new URL(request.url), route = url.pathname.match(/^(?:\/functions\/v1)?\/account-deletion\/(start|status|resume|continue)\/?$/)?.[1];
      if (request.method !== 'POST' || !route || url.search || !request.headers.get('Content-Type')?.startsWith('application/json')) throw new Failure('INVALID_DELETION_REQUEST', 400);
      let input: unknown;
      try { input = JSON.parse(new TextDecoder().decode(await bytes(request.body, 4096, operationSignal))); } catch { throw new Failure('INVALID_DELETION_REQUEST', 400); }
      if (route === 'start') {
        if (!exact(input, ['commandId', 'expectedRelationshipId', 'expectedRelationshipSessionId', 'recoveryToken']) ||
          !uuid.test(input.commandId) || !uuid.test(input.expectedRelationshipId) || !uuid.test(input.expectedRelationshipSessionId) || !tokenPattern.test(input.recoveryToken)) throw new Failure('INVALID_DELETION_REQUEST', 400);
        const authorization = request.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ') || [config.serviceKey, config.anonKey].includes(authorization.slice(7))) throw new Failure('AUTHENTICATION_REQUIRED', 401);
        const auth = await internal('/auth/v1/user', { headers: { apikey: config.anonKey, Authorization: authorization } });
        if (auth.status >= 500) throw new Failure('DELETION_UNCONFIRMED');
        const user = auth.ok ? await auth.json() : null;
        if (!user?.id || !uuid.test(user.id)) throw new Failure('AUTHENTICATION_REQUIRED', 401);
        jobId = input.commandId; recoveryHash = await digest(new TextEncoder().encode(input.recoveryToken));
        const result = status(await rpc('begin_account_deletion', { p_actor: user.id, p_command_id: jobId,
          p_expected_relationship_id: input.expectedRelationshipId, p_expected_relationship_session_id: input.expectedRelationshipSessionId, p_recovery_hash: recoveryHash }));
        return json(result, result.state === 'complete' ? 200 : 202);
      }
      if (route === 'continue') {
        // No scheduler is installed. A separately authorized trusted worker may
        // resume a stored job without needing the person's recovery capability.
        if (request.headers.get('Authorization') !== `Bearer ${config.serviceKey}`) throw new Failure('DELETION_UNAVAILABLE', 404);
        if (!exact(input, ['jobId']) || !uuid.test(input.jobId)) throw new Failure('INVALID_DELETION_REQUEST', 400);
        jobId = input.jobId;
        const response = await internal(`/rest/v1/account_deletion_jobs?id=eq.${jobId}&select=recovery_hash`, { headers: serviceHeaders });
        const rows = response.ok ? await response.json() : null;
        if (!Array.isArray(rows) || rows.length !== 1 || !/^[a-f0-9]{64}$/.test(rows[0].recovery_hash)) throw new Failure('DELETION_UNAVAILABLE', 404);
        recoveryHash = rows[0].recovery_hash;
      } else {
        if (!exact(input, ['jobId', 'recoveryToken']) || !uuid.test(input.jobId) || !tokenPattern.test(input.recoveryToken)) throw new Failure('INVALID_DELETION_REQUEST', 400);
        jobId = input.jobId; recoveryHash = await digest(new TextEncoder().encode(input.recoveryToken));
      }
      const job = { p_job_id: jobId, p_recovery_hash: recoveryHash };
      if (route === 'status') return json(status(await rpc('account_deletion_status', job)));
      const claimed = await rpc('claim_account_deletion', job);
      const current = status(claimed.status), work = claimed.work as Work | null;
      if (!work) return json(current, current.state === 'complete' ? 200 : 202);
      if (!uuid.test(work.leaseToken)) throw new Failure('DELETION_UNCONFIRMED');
      lease = work.leaseToken;
      const leased = { p_job_id: jobId, p_lease_token: lease };
      if (work.kind === 'storage') {
        if (!work.objectId || !uuid.test(work.objectId) || !['delete', 'message', 'archive'].includes(work.disposition ?? '') || !['pending', 'switched'].includes(work.state ?? '')) throw new Failure('DELETION_UNCONFIRMED');
        objectPath(work.sourceBucket, work.sourcePath);
        if (work.disposition !== 'delete') {
          if (!['message-media', 'retained-account-media'].includes(work.targetBucket ?? '')) throw new Failure('DELETION_UNCONFIRMED');
          let target = await download(work.targetBucket, work.targetPath, true);
          if (work.state === 'pending') {
            const source = await download(work.sourceBucket, work.sourcePath);
            if (!source || !source.mimeType || (work.byteSize != null && source.bytes.length !== work.byteSize)) throw new Failure('DELETION_UNCONFIRMED');
            const hash = await digest(source.bytes);
            if (!target) {
              const uploaded = await internal(`/storage/v1/object/${objectPath(work.targetBucket, work.targetPath)}`, { method: 'POST',
                headers: { ...serviceHeaders, 'Content-Type': source.mimeType, 'x-upsert': 'false', 'cache-control': '0' }, body: source.bytes });
              if (!uploaded.ok) {
                const error = await uploaded.json().catch(() => null);
                if (![400, 409].includes(uploaded.status) || !['Duplicate', '409'].includes(String(error?.error ?? error?.statusCode))) throw new Failure('DELETION_UNCONFIRMED');
              }
              target = await download(work.targetBucket, work.targetPath);
            }
            if (!target || target.mimeType !== source.mimeType || target.bytes.length !== source.bytes.length || await digest(target.bytes) !== hash) throw new Failure('DELETION_UNCONFIRMED');
            await rpc('switch_account_deletion_object', { ...leased, p_object_id: work.objectId, p_sha256: hash, p_byte_size: source.bytes.length, p_mime_type: source.mimeType });
          } else if (!target || !work.sha256 || await digest(target.bytes) !== work.sha256) throw new Failure('DELETION_UNCONFIRMED');
        }
        // Only after verified private persistence and the atomic reference switch.
        await rpc('authorize_account_deletion_object_removal', { ...leased, p_object_id: work.objectId });
        const removed = await internal(`/storage/v1/object/${encodeURIComponent(work.sourceBucket!)}`, { method: 'DELETE', headers: serviceHeaders,
          body: JSON.stringify({ prefixes: [work.sourcePath] }) });
        if (!removed.ok || await download(work.sourceBucket, work.sourcePath, true)) throw new Failure('DELETION_UNCONFIRMED');
        return json(status(await rpc('finish_account_deletion_object', { ...leased, p_object_id: work.objectId })), 202);
      }
      if (work.kind !== 'account' || (work.actorUserId !== null && !uuid.test(work.actorUserId ?? ''))) throw new Failure('DELETION_UNCONFIRMED');
      if (work.actorUserId !== null) {
        const removed = await internal(`/auth/v1/admin/users/${work.actorUserId}`, { method: 'DELETE', headers: serviceHeaders, body: JSON.stringify({ should_soft_delete: false }) });
        if (!removed.ok && removed.status !== 404) throw new Failure('DELETION_UNCONFIRMED');
        const check = await internal(`/auth/v1/admin/users/${work.actorUserId}`, { headers: serviceHeaders });
        if (check.status !== 404) throw new Failure('DELETION_UNCONFIRMED');
      }
      return json(status(await rpc('finish_account_deletion', leased)));
    } catch (error) {
      if (jobId && recoveryHash && lease) {
        try { return json(status(await rpc('fail_account_deletion', { p_job_id: jobId, p_lease_token: lease })), 202); }
        catch { try { return json(status(await rpc('account_deletion_status', { p_job_id: jobId, p_recovery_hash: recoveryHash }))); } catch { /* Unknown stays unknown. */ } }
      }
      const failure = error instanceof Failure ? error : new Failure('DELETION_UNCONFIRMED');
      return json({ error: { code: failure.code, message: messages[failure.code] ?? messages.DELETION_UNCONFIRMED } }, failure.status);
    }
  };
}
