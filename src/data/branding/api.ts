import { supabase, supabaseBackendId, supabasePublicKey } from '@/integrations/supabase/client';
import { currentSchema, historySchema, receiptSchema, type LogoIntent } from './schema';
export class BrandingError extends Error {
  constructor(public code: string) { super(code); }
}
export function brandingErrorText(error: unknown) {
  const code = error instanceof BrandingError ? error.code : '';
  const messages: Record<string, string> = {
    BRANDING_OWNER_REQUIRED: 'Only the appointed app owner can change the shared logo.',
    ACCOUNT_UNAVAILABLE: 'This account is unavailable.', ACCOUNT_CHANGED: 'Your signed-in account changed. Open this page again before editing.',
    LOGO_REVISION_CONFLICT: 'The shared logo changed elsewhere. Review the current logo, then try your selection again.',
    COMMAND_ID_REUSED: 'This request no longer matches its original selection. Choose the logo again.',
    LOGO_NOT_FOUND: 'That previous logo is no longer available.', LOGO_OBJECT_UNVERIFIED: 'The saved image could not be verified. The current logo was kept.',
    INVALID_INPUT: 'The logo request is invalid. Select your file again.',
    SAVE_UNCONFIRMED: 'The result could not be confirmed. Retry this same selection to safely check or finish it.',
    READ_UNAVAILABLE: 'The shared logo settings could not be loaded. Try refreshing them.',
  };
  return messages[code] ?? (code.startsWith('IMAGE_') ? 'Choose a valid PNG, JPEG, WebP or SVG image within 10 MB.' : messages.SAVE_UNCONFIRMED);
}
interface Dependencies {
  backend: string; publicKey: string; session: () => Promise<{ accountId: string; token: string } | null>;
  fetch: typeof fetch; timeoutMs?: number;
}
export function createBrandingTransport(deps: Dependencies) {
  async function call(account: string | null, action: (token: string, signal: AbortSignal) => Promise<unknown>, signal?: AbortSignal) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) throw new BrandingError('ACCOUNT_CHANGED');
    signal?.addEventListener('abort', abort, { once: true });
    let reject!: (error: Error) => void;
    const cancelled = new Promise<never>((_, fail) => { reject = fail; });
    const onAbort = () => reject(new BrandingError('SAVE_UNCONFIRMED'));
    controller.signal.addEventListener('abort', onAbort, { once: true });
    const timeout = setTimeout(abort, deps.timeoutMs ?? 35000);
    async function token() {
      if (!account) return deps.publicKey;
      const session = await deps.session();
      if (controller.signal.aborted || session?.accountId !== account || !session.token) throw new BrandingError('ACCOUNT_CHANGED');
      return session.token;
    }
    try { return await Promise.race([cancelled, (async () => {
      const value = await action(await token(), controller.signal);
      await token();
      return value;
    })()]); } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); controller.signal.removeEventListener('abort', onAbort); controller.abort(); }
  }
  async function request(path: string, token: string, signal: AbortSignal, init: RequestInit) {
    const r = await deps.fetch(`${deps.backend}${path}`, { ...init, redirect: 'error', cache: 'no-store', signal,
      headers: { ...init.headers, apikey: deps.publicKey, Authorization: `Bearer ${token}` } });
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      const code = data?.error?.code ?? data?.message;
      throw new BrandingError(typeof code === 'string' ? code : 'SAVE_UNCONFIRMED');
    }
    return data;
  }
  const read = (name: string, account: string | null, signal?: AbortSignal) => call(account, (token, abort) => request(`/rest/v1/rpc/${name}`, token, abort,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }), signal);
  return {
    current: async (signal?: AbortSignal) => currentSchema.parse(await read('get_app_branding', null, signal)),
    access: async (account: string, signal?: AbortSignal) => (await read('get_my_branding_access', account, signal)) === true,
    history: async (account: string, signal?: AbortSignal) => historySchema.parse(await read('get_app_branding_history', account, signal)),
    async write(account: string, intent: LogoIntent, signal?: AbortSignal) {
      const result = receiptSchema.parse(await call(account, (token, abort) => request(`/functions/v1/app-branding/${intent.kind}`, token, abort, {
        method: 'POST', headers: { 'Content-Type': intent.kind === 'upload' ? intent.blob.type : 'application/json',
          'x-command-id': intent.commandId, 'x-expected-revision': String(intent.expectedRevision) },
        body: intent.kind === 'upload' ? intent.blob : JSON.stringify({ versionId: intent.versionId }),
      }), signal));
      if (result.commandId !== intent.commandId || result.versionId !== (intent.kind === 'upload' ? intent.commandId : intent.versionId) || result.revision !== intent.expectedRevision + 1) throw new BrandingError('SAVE_UNCONFIRMED');
      return result;
    },
  };
}
export const brandingTransport = createBrandingTransport({ backend: supabaseBackendId, publicKey: supabasePublicKey,
  session: async () => { const { data, error } = await supabase.auth.getSession(); return !error && data.session ? { accountId: data.session.user.id, token: data.session.access_token } : null; },
  fetch: (input, init) => fetch(input, init),
});
