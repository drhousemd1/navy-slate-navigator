import type { ActionQueueScope, ActionTransport } from '@/data/actions/contracts';
import type { IdentityState } from '@/lib/identity';

/** Cached display state never authorizes a send. The existing transport/RPC
 * still validates the actor and performs the authoritative atomic checks. */
export function withCurrentVerification(transport: ActionTransport, checks: {
  identity(accountId: string, signal: AbortSignal): Promise<IdentityState>;
  accounting(scope: ActionQueueScope, signal: AbortSignal): Promise<boolean>;
  isCurrent(scope: ActionQueueScope): boolean;
}): ActionTransport {
  return { backendId: transport.backendId,
    // Receipt recovery is an owned-account read, not permission to execute an
    // old session. Its adapter independently pins and rechecks the account.
    readReceipt: transport.readReceipt?.bind(transport),
    async execute(command, scope, signal) {
    const unavailable = { kind: 'not_sent' as const, problem: { code: 'VERIFICATION_REQUIRED', retryable: true,
      message: 'Your current account and relationship could not be verified. The saved action is kept; no new request was sent.' } };
    try {
      if (signal.aborted || !checks.isCurrent(scope)) return unavailable;
      const identity = await checks.identity(scope.accountId, signal);
      if (signal.aborted || !checks.isCurrent(scope)) return unavailable;
      if (!identity.canAccessData || identity.currentUserId !== scope.accountId || identity.participantId !== scope.participantId ||
          identity.relationshipId !== scope.relationshipId || identity.relationshipStatus !== 'active' ||
          identity.relationshipSessionId !== scope.relationshipSessionId) {
        return { kind: 'not_sent', problem: { code: 'PERIOD_CHANGED', retryable: false,
          message: 'This saved action belongs to an account, relationship or session that is no longer active. It has been kept without sending.' } };
      }
      if (!await checks.accounting(scope, signal)) return { kind: 'not_sent', problem: { code: 'ACCOUNTING_UNAVAILABLE', retryable: false,
        message: 'Actions are not enabled for this relationship. The original saved action has been kept.' } };
      if (signal.aborted || !checks.isCurrent(scope)) return unavailable;
    } catch { return unavailable; }
    // Do not catch uncertain command outcomes as verification failures.
    return transport.execute(command, scope, signal);
  } };
}
