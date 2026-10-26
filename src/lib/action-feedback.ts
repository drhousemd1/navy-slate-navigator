import type { ActionFeedback, PendingActionState, Role } from '@/domain/actions/types';

export interface FeedbackScope {
  readonly accountId: string;
  readonly participantId: string;
  /** The current relationship period, not a partner's account ID. */
  readonly relationshipId: string;
}

export type RefundAudience =
  | { readonly kind: 'recipient' }
  | {
      readonly kind: 'actor_acknowledgement';
      readonly recipientParticipantId: string;
      readonly recipientRole: Role;
    };

export interface ScopedActionFeedback {
  /** Capture when starting the command/loading the delivery, before awaiting it. */
  readonly scope: FeedbackScope;
  readonly state: PendingActionState;
  readonly audience: RefundAudience;
}

export type RefundFeedback = Extract<ActionFeedback, { kind: 'points_refunded' }>;

export interface RefundPresentation {
  readonly key: string;
  readonly feedback: RefundFeedback;
  readonly audience: RefundAudience['kind'];
  readonly amount: string;
  readonly currencyLabel: string;
  readonly recipient: string;
  readonly reason: string;
  readonly balanceLabel: string;
  readonly balanceAfter: string;
}

/** Only opaque identifiers live here. Keep one ledger above route changes.
 * This is same-session presentation deduplication, not durable delivery/history.
 */
export interface ActionFeedbackLedger {
  claim(key: string): boolean;
}

export function createActionFeedbackLedger(): ActionFeedbackLedger {
  const presented = new Set<string>();
  return {
    claim(key) {
      if (presented.has(key)) return false;
      presented.add(key);
      return true;
    },
  };
}

export const actionFeedbackLedger = createActionFeedbackLedger();

export function feedbackScopeKey(scope: FeedbackScope): string {
  return JSON.stringify([scope.accountId, scope.participantId, scope.relationshipId]);
}

const formatPoints = (value: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 20 }).format(value);

/** Presentation checks prevent stale/misaddressed feedback; the server still
 * owns authorization, refunds, balances and transaction confirmation.
 */
export function getRefundPresentations(
  result: ScopedActionFeedback | null,
  activeScope: FeedbackScope,
): RefundPresentation[] {
  if (!result || result.state.status !== 'confirmed' ||
      !activeScope.accountId || !activeScope.participantId || !activeScope.relationshipId ||
      feedbackScopeKey(result.scope) !== feedbackScopeKey(activeScope)) return [];
  const receipt = result.state.receipt;
  if (receipt.relationshipId !== activeScope.relationshipId ||
      !receipt.confirmedAt || !Number.isFinite(Date.parse(receipt.confirmedAt))) return [];
  const audience = result.audience;
  const recipientId = audience.kind === 'recipient' ? activeScope.participantId : audience.recipientParticipantId;
  if (!recipientId || (audience.kind === 'actor_acknowledgement' && recipientId === activeScope.participantId)) return [];

  const keys = new Set<string>();
  return receipt.feedback.flatMap(feedback => {
    if (feedback.kind !== 'points_refunded' || feedback.recipientParticipantId !== recipientId ||
        !receipt.eventIds.includes(feedback.eventId) || !feedback.eventId ||
        !Number.isFinite(feedback.points) || feedback.points <= 0 || !Number.isFinite(feedback.balanceAfter) ||
        (feedback.currency !== 'dom' && feedback.currency !== 'sub') ||
        (audience.kind === 'actor_acknowledgement' && feedback.currency !== audience.recipientRole)) return [];
    const balance = receipt.balances.find(b => b.participantId === recipientId && b.currency === feedback.currency);
    if (!balance || balance.balance !== feedback.balanceAfter) return [];
    const reasons: Record<RefundFeedback['reason'], string> = {
      reward_deleted: 'The reward was deleted. Points for its unused purchases were returned.',
      purchase_undone: 'The purchase was undone and its points were returned.',
      redemption_undone_after_deletion: 'Use of this deleted reward was undone, so its points were returned.',
    };
    if (!reasons[feedback.reason]) return [];
    const key = JSON.stringify([activeScope.accountId, activeScope.participantId, receipt.relationshipId, feedback.eventId, recipientId]);
    if (keys.has(key)) return [];
    keys.add(key);
    const role = feedback.currency === 'dom' ? 'Dom' : 'Sub';
    const own = audience.kind === 'recipient';
    return [{
      key, feedback, audience: audience.kind,
      amount: formatPoints(feedback.points), currencyLabel: role,
      recipient: own ? 'Returned to your balance' : `Returned to your ${role} partner’s balance`,
      reason: reasons[feedback.reason],
      balanceLabel: own ? `Your ${role} balance after this refund` : `Your ${role} partner’s balance after this refund`,
      balanceAfter: formatPoints(feedback.balanceAfter),
    }];
  });
}
