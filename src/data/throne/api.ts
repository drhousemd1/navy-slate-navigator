import { supabase, supabaseBackendId, supabasePublicKey } from '@/integrations/supabase/client';
import { decodeCards, receiptSchema, validateIntent, type ThroneIntent } from './schema';

export class ThroneError extends Error { constructor(public code: string, public definitive = false) { super(code); } }
export function throneErrorText(error: unknown): string {
  const code = error instanceof ThroneError ? error.code : error instanceof Error ? error.message : '';
  const messages: Record<string, string> = {
    ACCOUNT_CHANGED: 'Your account changed. Reopen your cards in the current account.',
    ACCOUNT_UNAVAILABLE: 'This account is unavailable for changes.',
    CARD_REVISION_CONFLICT: 'This card changed elsewhere. Close the editor and refresh your cards before editing again.',
    CARD_NOT_FOUND: 'This card is no longer available. Close the editor and refresh your cards.',
    CARD_LIMIT: 'You can keep up to 20 personal cards. Delete one before adding another.',
    CARD_TOO_LARGE: 'This card exceeds 6 MB. Remove an image or choose smaller images.',
    INVALID_INPUT: 'Check the title, colors and images before saving.',
    CARDS_UNAVAILABLE: 'Your personal cards could not be loaded. Retry to see their current state.',
    SAVE_UNCONFIRMED: 'The change could not be confirmed. Retry the same change, or close and refresh to check whether it saved.',
  };
  return messages[code] ?? 'The card could not be saved. Check its fields and try again.';
}
interface Dependencies {
  backend: string; publicKey: string; fetch: typeof fetch; timeoutMs?: number;
  session: () => Promise<{ accountId: string; token: string } | null>;
}
export function createThroneTransport(deps: Dependencies) {
  async function call(account: string, method: string, body: object, signal?: AbortSignal): Promise<unknown> {
    if (!account || signal?.aborted) throw new ThroneError('ACCOUNT_CHANGED', true);
    const controller = new AbortController(); const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    let rejectTimeout!: (error: Error) => void;
    const timeout = new Promise<never>((_, reject) => { rejectTimeout = reject; });
    const onAbort = () => rejectTimeout(new ThroneError(method === 'get_throne_cards' ? 'CARDS_UNAVAILABLE' : 'SAVE_UNCONFIRMED'));
    controller.signal.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(abort, deps.timeoutMs ?? 15_000);
    async function check() {
      const session = await deps.session();
      if (session?.accountId !== account || !session.token) throw new ThroneError('ACCOUNT_CHANGED', true);
      if (controller.signal.aborted) throw new ThroneError('SAVE_UNCONFIRMED');
      return session.token;
    }
    try { return await Promise.race([timeout, (async () => {
      const token = await check();
      const response = await deps.fetch(`${deps.backend}/rest/v1/rpc/${method}`, {
        method: 'POST', redirect: 'error', signal: controller.signal,
        headers: { Authorization: `Bearer ${token}`, apikey: deps.publicKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const result = await response.json(); await check();
      if (!response.ok) {
        const known = ['ACCOUNT_UNAVAILABLE', 'CARD_REVISION_CONFLICT', 'CARD_NOT_FOUND', 'CARD_LIMIT', 'CARD_TOO_LARGE', 'INVALID_INPUT'];
        throw new ThroneError(known.includes(result?.message) ? result.message : method === 'get_throne_cards' ? 'CARDS_UNAVAILABLE' : 'SAVE_UNCONFIRMED', known.includes(result?.message));
      }
      return result;
    })()]); } catch (error) {
      if (error instanceof ThroneError) throw error;
      throw new ThroneError(method === 'get_throne_cards' ? 'CARDS_UNAVAILABLE' : 'SAVE_UNCONFIRMED');
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); controller.signal.removeEventListener('abort', onAbort); controller.abort(); }
  }
  return {
    read: async (account: string, signal?: AbortSignal) => {
      const data = await call(account, 'get_throne_cards', {}, signal);
      try { return decodeCards(data, account); } catch { throw new ThroneError('CARDS_UNAVAILABLE'); }
    },
    write: async (account: string, intent: ThroneIntent, signal?: AbortSignal) => {
      validateIntent(intent);
      const result = await call(account, 'commit_throne_card', { p_actor: account, p_card_id: intent.cardId, p_command_id: intent.commandId,
        p_expected_revision: intent.expectedRevision, p_kind: intent.kind, p_definition: intent.definition }, signal);
      const receipt = receiptSchema.safeParse(result);
      if (!receipt.success || receipt.data.commandId !== intent.commandId || receipt.data.cardId !== intent.cardId ||
          receipt.data.revision !== intent.expectedRevision + 1 || receipt.data.deleted !== (intent.kind === 'delete')) throw new ThroneError('SAVE_UNCONFIRMED');
      return receipt.data;
    },
  };
}
export type ThroneTransport = ReturnType<typeof createThroneTransport>;
export const throneTransport = createThroneTransport({ backend: supabaseBackendId, publicKey: supabasePublicKey,
  fetch: (input, init) => fetch(input, init),
  session: async () => { const { data, error } = await supabase.auth.getSession(); return !error && data.session ? { accountId: data.session.user.id, token: data.session.access_token } : null; },
});
