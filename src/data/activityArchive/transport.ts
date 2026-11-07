import { supabase, supabaseBackendId } from '@/integrations/supabase/client';
import { decodeIdentity } from '@/lib/identity';
import { activityDomains, decodeRetainedHistory, decodeRetainedPeriods, type ActivityArchiveScope, type ActivityDomain } from './types';

export class ActivityArchiveError extends Error {
  constructor(public readonly code: string) { super(code); }
}
const contextErrors = new Set(['ACCOUNT_CHANGED', 'STALE_RELATIONSHIP', 'STALE_RELATIONSHIP_SESSION', 'VALID_IDENTITY_REQUIRED', 'AUTHENTICATION_REQUIRED']);
export const archiveContextExpired = (error: unknown) => error instanceof ActivityArchiveError && contextErrors.has(error.code);
export const archiveNeedsRefresh = (error: unknown) => archiveContextExpired(error) || error instanceof ActivityArchiveError && ['RETAINED_PERIOD_NOT_FOUND', 'RETAINED_PERIOD_NOT_ARCHIVED'].includes(error.code);
export function archiveErrorText(error: unknown): string {
  if (archiveNeedsRefresh(error)) return 'Your account or connection changed, or this earlier period is no longer available. Reload the period choices before continuing.';
  if (error instanceof ActivityArchiveError && error.code === 'ACTIVITY_TIMEOUT') return 'Earlier history took too long to load. Retry when your connection is available.';
  return 'Earlier history could not be verified. Retry to load its saved records.';
}
interface RpcResult { data: unknown; error: { message: string } | null }
interface ArchiveDependencies {
  backendId: string;
  session: () => Promise<{ accountId: string; token: string } | null>;
  rpc: (name: string, args: Record<string, unknown>, token: string, signal: AbortSignal) => Promise<RpcResult>;
  identity: (accountId: string, token: string, signal: AbortSignal) => Promise<{ currentUserId: string | null; canAccessData: boolean; relationshipId?: string | null; relationshipSessionId: string | null }>;
  timeoutMs?: number;
}
export function createActivityArchiveTransport(deps: ArchiveDependencies) {
  function scopeArgs(scope: ActivityArchiveScope) {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (scope.backendId !== deps.backendId || ![scope.accountId, scope.relationshipId, scope.relationshipSessionId].every(id => uuid.test(id))) throw new ActivityArchiveError('ACCOUNT_CHANGED');
    return { p_expected_relationship_id: scope.relationshipId, p_expected_relationship_session_id: scope.relationshipSessionId };
  }
  async function call<T>(scope: ActivityArchiveScope, name: string, args: Record<string, unknown>, decode: (value: unknown) => T, outer?: AbortSignal): Promise<T> {
    const controller = new AbortController();
    const abort = () => controller.abort(new DOMException('History read cancelled', 'AbortError'));
    if (outer?.aborted) { abort(); throw controller.signal.reason; }
    outer?.addEventListener('abort', abort, { once: true });
    let reject!: (reason: unknown) => void;
    const cancelled = new Promise<never>((_resolve, no) => { reject = no; });
    const fail = () => reject(controller.signal.reason);
    controller.signal.addEventListener('abort', fail, { once: true });
    const timer = setTimeout(() => controller.abort(new ActivityArchiveError('ACTIVITY_TIMEOUT')), deps.timeoutMs ?? 12_000);
    const checkedToken = async () => {
      const session = await deps.session();
      if (controller.signal.aborted) throw controller.signal.reason;
      if (session?.accountId !== scope.accountId || !session.token) throw new ActivityArchiveError('ACCOUNT_CHANGED');
      return session.token;
    };
    try {
      return await Promise.race([cancelled, (async () => {
        const token = await checkedToken();
        const result = await deps.rpc(name, args, token, controller.signal);
        if (controller.signal.aborted) throw controller.signal.reason;
        if (result.error) throw new ActivityArchiveError(result.error.message);
        const decoded = decode(result.data);
        const current = await deps.identity(scope.accountId, await checkedToken(), controller.signal);
        if (controller.signal.aborted) throw controller.signal.reason;
        if (!current.canAccessData || current.currentUserId !== scope.accountId || current.relationshipId !== scope.relationshipId || current.relationshipSessionId !== scope.relationshipSessionId) throw new ActivityArchiveError('STALE_RELATIONSHIP_SESSION');
        await checkedToken();
        return decoded;
      })()]);
    } finally {
      clearTimeout(timer); outer?.removeEventListener('abort', abort); controller.signal.removeEventListener('abort', fail); controller.abort();
    }
  }
  return {
    periods: (scope: ActivityArchiveScope, signal?: AbortSignal) => call(scope, 'list_my_retained_activity_periods', scopeArgs(scope), value => decodeRetainedPeriods(value, scope), signal),
    history: (scope: ActivityArchiveScope, periodId: string, domain: ActivityDomain, cursor: string | null = null, signal?: AbortSignal) => {
      if (periodId === scope.relationshipId || !activityDomains.includes(domain)) return Promise.reject(new ActivityArchiveError('RETAINED_PERIOD_NOT_ARCHIVED'));
      return call(scope, 'get_my_retained_activity_history', { ...scopeArgs(scope), p_retained_relationship_id: periodId, p_domain: domain, p_cursor: cursor, p_limit: 30 }, value => decodeRetainedHistory(value, scope, periodId, domain, cursor), signal);
    },
  };
}
export type ActivityArchiveTransport = ReturnType<typeof createActivityArchiveTransport>;
const rpc: ArchiveDependencies['rpc'] = async (name, args, token, signal) => {
  // Forward migration RPCs are absent from the historical generated types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const database = supabase as any;
  return await database.rpc(name, args).setHeader('Authorization', `Bearer ${token}`).abortSignal(signal);
};
export const activityArchiveTransport = createActivityArchiveTransport({ backendId: supabaseBackendId, rpc,
  session: async () => { const { data: { session }, error } = await supabase.auth.getSession(); return error || !session ? null : { accountId: session.user.id, token: session.access_token }; },
  identity: async (accountId, token, signal) => {
    const result = await rpc('get_my_identity', {}, token, signal);
    if (result.error) throw new ActivityArchiveError(result.error.message);
    return decodeIdentity(accountId, result.data);
  },
});
