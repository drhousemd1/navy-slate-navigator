import { supabase, supabaseBackendId } from '@/integrations/supabase/client';
import type { ProfileRole } from '@/types/profile';
import { decodeRoleOptions, decodeRoleReceipt, decodeRoleResult, intentSchema, roleScopeSchema, type RoleIntent, type RoleScope } from './types';

export class RoleTransitionError extends Error { constructor(public code: string) { super(code); } }
const rejected = new Set(['ROLE_REVIEW_CHANGED', 'ROLE_SAVED_PERIOD_UNAVAILABLE', 'INVALID_ROLE_TRANSITION_MODE', 'ROLE_CHANGE_NOT_REQUIRED', 'INVALID_PROFILE_ROLE',
  'STALE_RELATIONSHIP', 'STALE_RELATIONSHIP_SESSION', 'UNLINK_BEFORE_ROLE_CHANGE', 'VALID_IDENTITY_REQUIRED', 'LIFECYCLE_INTEGRATION_REQUIRED', 'ROLE_LIFECYCLE_INTEGRATION_REQUIRED',
  'LIFECYCLE_ACCOUNTING_INTEGRATION_REQUIRED', 'LIFECYCLE_WALLET_MISSING']);
export const roleRequestRejected = (error: unknown) => error instanceof RoleTransitionError && rejected.has(error.code);
export const roleErrorText = (error: unknown) => roleRequestRejected(error)
  ? 'Your saved progress or connection changed, or this choice is unavailable. Review the current choices again before making a new request.'
  : error instanceof RoleTransitionError && error.code === 'ROLE_STORAGE_UNAVAILABLE'
    ? 'The role change could not be saved safely on this device. No new request was sent. Retry after storage is available.'
    : 'The role change result is not confirmed. Check the saved request before making another change.';
interface Dependencies {
  backendId: string; timeoutMs?: number;
  session: () => Promise<{ accountId: string; token: string } | null>;
  rpc: (name: string, args: Record<string, unknown>, token: string, signal: AbortSignal) => Promise<{ data: unknown; error: { message: string } | null }>;
}
export function createRoleTransport(deps: Dependencies) {
  async function call<T>(accountId: string, name: string, args: Record<string, unknown>, decode: (data: unknown) => T, signal?: AbortSignal): Promise<T> {
    const controller = new AbortController();
    const abort = () => controller.abort(new DOMException('Role request cancelled', 'AbortError'));
    if (signal?.aborted) { abort(); throw controller.signal.reason; }
    signal?.addEventListener('abort', abort, { once: true });
    let fail!: (reason: unknown) => void;
    const deadline = new Promise<never>((_resolve, reject) => { fail = reject; });
    const onAbort = () => fail(controller.signal.reason); controller.signal.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(new RoleTransitionError('ROLE_TIMEOUT')), deps.timeoutMs ?? 12_000);
    const check = async () => {
      const session = await deps.session();
      if (controller.signal.aborted) throw controller.signal.reason;
      if (!session || session.accountId !== accountId || !session.token) throw new RoleTransitionError('ACCOUNT_CHANGED');
      return session.token;
    };
    try { return await Promise.race([deadline, (async () => {
      const token = await check(); const response = await deps.rpc(name, args, token, controller.signal);
      if (controller.signal.aborted) throw controller.signal.reason;
      await check();
      if (response.error) throw new RoleTransitionError(response.error.message);
      return decode(response.data);
    })()]); } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); controller.signal.removeEventListener('abort', onAbort); controller.abort(); }
  }
  const context = (scope: RoleScope) => {
    roleScopeSchema.parse(scope); if (scope.backendId !== deps.backendId) throw new RoleTransitionError('ACCOUNT_CHANGED');
    return { p_expected_relationship_id: scope.relationshipId, p_expected_relationship_session_id: scope.relationshipSessionId };
  };
  return {
    options: (scope: RoleScope, role: ProfileRole, signal?: AbortSignal) => call(scope.accountId, 'get_my_role_change_options', { ...context(scope), p_role: role }, data => decodeRoleOptions(data, scope, role), signal),
    change: (intent: RoleIntent, signal?: AbortSignal) => {
      intentSchema.parse(intent);
      return call(intent.scope.accountId, 'change_my_role', { ...context(intent.scope), p_command_id: intent.commandId, p_role: intent.role, p_mode: intent.mode,
        p_saved_period_id: intent.savedPeriodId, p_current_review_token: intent.currentReviewToken, p_destination_review_token: intent.destinationReviewToken }, data => decodeRoleReceipt(data, intent), signal);
    },
    result: (intent: RoleIntent, signal?: AbortSignal) => {
      intentSchema.parse(intent); context(intent.scope);
      return call(intent.scope.accountId, 'get_my_role_change_result', { p_command_id: intent.commandId }, data => decodeRoleResult(data, intent), signal);
    },
  };
}
export type RoleTransport = ReturnType<typeof createRoleTransport>;
export const roleTransport = createRoleTransport({ backendId: supabaseBackendId,
  session: async () => { const { data: { session }, error } = await supabase.auth.getSession(); return error || !session ? null : { accountId: session.user.id, token: session.access_token }; },
  rpc: async (name, args, token, signal) => {
    // Forward migration RPCs are absent from the historical generated types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (supabase as any).rpc(name, args).setHeader('Authorization', `Bearer ${token}`).abortSignal(signal);
  },
});
