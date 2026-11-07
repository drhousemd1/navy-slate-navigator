import { PublicationError, REVISION_PREFIX, type PublicationStore } from './publication.ts';

export function publicationTarget(value: string, local = false): string {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
    (local ? !['127.0.0.1', '[::1]'].includes(url.hostname) || url.protocol !== 'http:' || !url.port :
      url.protocol !== 'https:' || !!url.port || !/^[a-z]{20}\.supabase\.co$/.test(url.hostname)))
    throw new PublicationError('storage', 'Choose an explicit hosted Supabase project or use local mode with an explicit loopback port.');
  return url.origin;
}

/** Same authenticated REST adapter for the app and the operator command.
 * Credentials exist only in request headers; no public URLs or redirect following. */
export function createPublicationStore(options: {
  targetUrl: string; apiKey: string; bearer: string; local?: boolean; namespace?: string; signal?: AbortSignal; fetch?: typeof fetch;
}): PublicationStore {
  const base = new URL(publicationTarget(options.targetUrl, options.local));
  const namespace = options.namespace ?? '';
  if (namespace && !/^rehearsals\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(namespace))
    throw new PublicationError('storage', 'Invalid synthetic publication namespace.');
  const prefix = namespace ? namespace + '/' : '';
  if (!options.apiKey || !options.bearer) throw new PublicationError('access', 'Authenticated Storage credentials are required.');
  const request = options.fetch ?? fetch;
  const object = (path: string) => {
    if (!/^(current\.json|plan-[a-f0-9]{64}\.html|revisions\/\d{12}\.json)$/.test(path))
      throw new PublicationError('integrity', 'Invalid publication object path.');
    return (prefix + path).split('/').map(encodeURIComponent).join('/');
  };
  const call = (path: string, init: RequestInit = {}) => request(new URL(path, base), {
    ...init, headers: { apikey: options.apiKey, Authorization: `Bearer ${options.bearer}`, ...init.headers },
    redirect: 'error', cache: 'no-store', signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000),
  });
  const requireSuccess = (response: Response) => {
    if (!response.ok) throw new PublicationError([401, 403].includes(response.status) ? 'access' : 'storage', 'Private publication Storage could not be verified.');
  };
  const bytes = async (response: Response, limit: number) => {
    const reader = response.body?.getReader();
    if (!reader) throw new PublicationError('storage', 'Private publication response is missing.');
    const parts: Uint8Array[] = []; let length = 0;
    try { for (;;) { const chunk = await reader.read(); if (chunk.done) break; length += chunk.value.length;
      if (length > limit) { await reader.cancel(); throw new PublicationError('integrity', 'Publication response exceeds its size limit.'); }
      parts.push(chunk.value); } } finally { reader.releaseLock(); }
    const result = new Uint8Array(length); let offset = 0; for (const part of parts) { result.set(part, offset); offset += part.length; } return result;
  };
  return {
    async read(path, limit) {
      const response = await call(`/storage/v1/object/authenticated/admin-documents/${object(path)}?cacheNonce=${crypto.randomUUID()}`);
      requireSuccess(response); return bytes(response, limit);
    },
    async list(offset, limit) {
      const response = await call('/storage/v1/object/list/admin-documents', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: prefix + REVISION_PREFIX + '/', limit, offset, sortBy: { column: 'name', order: 'asc' } }) });
      requireSuccess(response);
      let value: unknown; try { value = JSON.parse(new TextDecoder().decode(await bytes(response, 1024 * 1024))); } catch { throw new PublicationError('storage', 'Publication listing is invalid.'); }
      if (!Array.isArray(value) || value.length > limit || value.some(item => !item || typeof item.name !== 'string' || !item.id))
        throw new PublicationError('integrity', 'Publication listing is invalid.');
      return value.map(item => item.name);
    },
    async create(path, value, contentType) {
      if (path === 'current.json') throw new PublicationError('integrity', 'The legacy publication anchor cannot be replaced.');
      const response = await call(`/storage/v1/object/admin-documents/${object(path)}`, { method: 'POST',
        headers: { 'Content-Type': contentType, 'x-upsert': 'false', 'cache-control': '0' }, body: new Uint8Array(value) });
      requireSuccess(response); await response.body?.cancel();
    },
  };
}
