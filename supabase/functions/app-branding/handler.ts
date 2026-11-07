import { createService, MediaError, readBytes, MAX_LOGO_BYTES, UUID, type Config } from './service.ts';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-command-id, x-expected-revision',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
export function createBrandingHandler(config: Config, fetcher: typeof fetch = fetch) {
  return async (request: Request) => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    try {
      const url = new URL(request.url), route = url.pathname.match(/^(?:\/functions\/v1)?\/app-branding\/(upload|restore)$/)?.[1];
      if (request.method !== 'POST' || !route || url.search) throw new MediaError('INVALID_INPUT');
      const signal = AbortSignal.any([request.signal, AbortSignal.timeout(30000)]);
      const service = createService(config, fetcher, signal);
      const actor = await service.actor(request.headers.get('Authorization'));
      await service.checkOwner(actor); // Before reading any upload bytes or restore input.
      const commandId = request.headers.get('x-command-id') ?? '', rawRevision = request.headers.get('x-expected-revision') ?? '';
      const revision = Number(rawRevision);
      if (!UUID.test(commandId) || !/^(0|[1-9][0-9]*)$/.test(rawRevision) || !Number.isSafeInteger(revision) || revision >= Number.MAX_SAFE_INTEGER) throw new MediaError('INVALID_INPUT');
      let versionId = commandId, upload = null;
      if (route === 'upload') {
        upload = await service.upload(commandId, await readBytes(request.body, MAX_LOGO_BYTES, signal), request.headers.get('Content-Type') ?? '');
      } else {
        if (request.headers.get('Content-Type') !== 'application/json') throw new MediaError('INVALID_INPUT');
        let input;
        try { input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await readBytes(request.body, 256, signal))); }
        catch (e) { if (e instanceof MediaError) throw e; throw new MediaError('INVALID_INPUT'); }
        if (!input || Object.keys(input).length !== 1 || !UUID.test(input.versionId ?? '')) throw new MediaError('INVALID_INPUT');
        versionId = input.versionId;
        await service.verifyVersion(actor, versionId);
      }
      if (signal.aborted) throw new MediaError('SAVE_UNCONFIRMED', 503);
      return json(await service.commit(actor, commandId, revision, versionId, upload));
    } catch (e) {
      const error = e instanceof MediaError ? e : new MediaError('SAVE_UNCONFIRMED', 503);
      return json({ error: { code: error.code } }, error.status);
    }
  };
}
