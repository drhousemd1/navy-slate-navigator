import { supabase, supabaseBackendId, supabasePublicKey } from '@/integrations/supabase/client';
import type { EncyclopediaIntent, EncyclopediaScope } from '@/types/encyclopedia';
import { decodeLibrary, decodeReceipt, intentSchema } from './schema';

import { EncyclopediaError } from './errors';
export { EncyclopediaError, encyclopediaErrorText } from './errors';
interface Dependencies {
  backendId: string; publicKey: string; timeoutMs?: number;
  session: () => Promise<{ accountId: string; token: string } | null>;
  read: (token: string, signal: AbortSignal) => Promise<{ data: unknown; error: unknown }>;
  fetch: typeof fetch;
}
export function createEncyclopediaTransport(deps: Dependencies) {
  async function call<T>(scope: EncyclopediaScope, work: (token: string, signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (scope.backendId !== deps.backendId || !scope.accountId) throw new EncyclopediaError('ACCOUNT_CHANGED');
    const controller = new AbortController(); const abort = () => controller.abort();
    if (signal?.aborted) throw new EncyclopediaError('CANCELLED');
    signal?.addEventListener('abort', abort, { once: true });
    let fail!: (error: Error) => void;
    const cancelled = new Promise<never>((_, reject) => { fail = reject; });
    const onAbort = () => fail(new EncyclopediaError('UNCONFIRMED'));
    controller.signal.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(abort, deps.timeoutMs ?? 15_000);
    async function check() {
      const session = await deps.session();
      if (controller.signal.aborted) throw new EncyclopediaError('CANCELLED');
      if (session?.accountId !== scope.accountId || !session.token) throw new EncyclopediaError('ACCOUNT_CHANGED');
      return session.token;
    }
    try { return await Promise.race([cancelled, (async () => {
      const token = await check(); const result = await work(token, controller.signal); await check(); return result;
    })()]); } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); controller.signal.removeEventListener('abort', onAbort); controller.abort(); }
  }
  return {
    read: (scope: EncyclopediaScope, signal?: AbortSignal) => call(scope, async (token, abortSignal) => {
      const response = await deps.read(token, abortSignal);
      if (response.error) throw new EncyclopediaError('LIBRARY_UNAVAILABLE');
      return decodeLibrary(response.data);
    }, signal),
    write: (scope: EncyclopediaScope, intent: EncyclopediaIntent, signal?: AbortSignal) => {
      intentSchema.parse(intent);
      const { kind, ...body } = intent;
      const json = JSON.stringify(body);
      if (new TextEncoder().encode(json).byteLength > 8 * 1024 * 1024) throw new EncyclopediaError('INVALID_INPUT', true);
      return call(scope, async (token, abortSignal) => {
        const response = await deps.fetch(`${deps.backendId}/functions/v1/encyclopedia-admin/${kind}`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, apikey: deps.publicKey, 'Content-Type': 'application/json' }, body: json, signal: abortSignal,
        });
        const data = await response.json();
        if (!response.ok) {
          const code = data?.error?.code;
          throw new EncyclopediaError(typeof code === 'string' ? code : 'UNCONFIRMED', [400, 404, 409, 413].includes(response.status));
        }
        return decodeReceipt(data, intent);
      }, signal);
    },
  };
}
export type EncyclopediaTransport = ReturnType<typeof createEncyclopediaTransport>;
export const encyclopediaTransport = createEncyclopediaTransport({ backendId: supabaseBackendId, publicKey: supabasePublicKey,
  session: async () => { const { data, error } = await supabase.auth.getSession(); return !error && data.session ? { accountId: data.session.user.id, token: data.session.access_token } : null; },
  read: async (token, signal) => {
    // The additive library RPC is absent from the historical generated schema.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (supabase as any).rpc('get_encyclopedia_library', {}).setHeader('Authorization', `Bearer ${token}`).abortSignal(signal);
  },
  fetch: (input, init) => fetch(input, init),
});
