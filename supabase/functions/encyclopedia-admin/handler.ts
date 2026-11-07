import { LibraryError, MAX_BODY_BYTES, validateCommand } from './validation.ts';
import { createService, type Config } from './service.ts';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff' };
const messages: Record<string, string> = { AUTHENTICATION_REQUIRED: 'Sign in to continue.', EDITOR_REQUIRED: 'Library editing permission is required.',
  ACCOUNT_UNAVAILABLE: 'This account is unavailable.', INVALID_INPUT: 'Check the entry and try again.', REQUEST_TOO_LARGE: 'This entry is too large.',
  ENTRY_NOT_FOUND: 'This entry is no longer available.', ENTRY_REVISION_CONFLICT: 'This entry changed. Review its latest version before saving.',
  COMMAND_ID_REUSED: 'This request differs from its saved intent.', ENTRY_ID_REUSED: 'This entry was deleted. Create a new entry instead.',
  SAVE_UNCONFIRMED: 'The result could not be confirmed. Retry the same saved request.' };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
async function readBody(body: ReadableStream<Uint8Array> | null, signal: AbortSignal) {
  if (!body) throw new LibraryError('INVALID_INPUT');
  const reader = body.getReader(), parts: Uint8Array[] = []; let length = 0;
  let abort: () => void = () => {};
  const cancelled = new Promise<never>((_, reject) => { abort = () => { void reader.cancel().catch(() => {}); reject(new LibraryError('SAVE_UNCONFIRMED', 503)); }; });
  if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
  try {
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), cancelled]);
      if (signal.aborted) throw new LibraryError('SAVE_UNCONFIRMED', 503);
      if (done) break;
      length += value.length;
      if (length > MAX_BODY_BYTES) { void reader.cancel().catch(() => {}); throw new LibraryError('REQUEST_TOO_LARGE', 413); }
      parts.push(value);
    }
  } finally { signal.removeEventListener('abort', abort); reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0; for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { throw new LibraryError('INVALID_INPUT'); }
}
export function createEncyclopediaHandler(config: Config, fetcher: typeof fetch = fetch) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    try {
      const url = new URL(request.url), route = url.pathname.match(/^(?:\/functions\/v1)?\/encyclopedia-admin\/(save|delete)\/?$/)?.[1];
      if (request.method !== 'POST' || !route || url.search || !request.headers.get('Content-Type')?.startsWith('application/json')) throw new LibraryError('INVALID_INPUT');
      const signal = AbortSignal.any([request.signal, AbortSignal.timeout(30000)]);
      const service = createService(config, fetcher, signal);
      const actor = await service.actor(request.headers.get('Authorization'));
      await service.checkEditor(actor); // Reject ordinary users before raster parsing.
      const input = await readBody(request.body, signal);
      const command = await validateCommand(input, route as 'save' | 'delete');
      if (signal.aborted) throw new LibraryError('SAVE_UNCONFIRMED', 503);
      return json(await service.commit(actor, route, command));
    } catch (error) {
      const failure = error instanceof LibraryError ? error : new LibraryError('SAVE_UNCONFIRMED', 503);
      return json({ error: { code: failure.code, message: messages[failure.code] ?? (failure.code.startsWith('IMAGE_') ? 'Choose a supported raster image within the size limit.' : messages.SAVE_UNCONFIRMED) } }, failure.status);
    }
  };
}
