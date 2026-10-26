import { useState } from 'react';
import { useActionCommands } from '@/contexts/ActionCommandsContext';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { ConfirmedActionFeedback } from '@/components/activity/ConfirmedActionFeedback';
import { acknowledgeRewardFeedback } from '@/data/rewards/actionReadModel';
import type { ActionReceipt } from '@/domain/actions/types';

/** Recipient delivery is an outbox read, independent of the actor's browser.
 * Dismissal is durable only after the server acknowledges it. A crash before
 * that acknowledgment may show it again; no exactly-once delivery is claimed.
 */
export function RewardFeedback() {
  const actions = useActionCommands();
  const settings = useNotificationSettings();
  const [failed, setFailed] = useState<{ account: string; period: string; event: string; message: string }[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const scope = actions.scope;
  if (!scope || actions.mode !== 'atomic') return null;
  const enabled = settings.accountId === scope.accountId && settings.isReady && settings.preferences.enabled;
  const ack = async (event: string) => {
    try {
      await acknowledgeRewardFeedback(scope, event);
      setFailed(previous => previous.filter(item => !(item.account === scope.accountId && item.period === scope.relationshipId && item.event === event)));
      await actions.refresh();
    } catch (error) {
      setFailed(previous => [...previous.filter(item => !(item.account === scope.accountId && item.event === event)), {
        account: scope.accountId, period: scope.relationshipId, event,
        message: error instanceof Error ? error.message : 'Dismissal was not confirmed.',
      }]);
    }
  };
  const deliveries = (actions.data?.deliveries ?? []).filter(row => row.kind === 'points_refunded' && !actions.data?.acknowledged.includes(row.event_id));
  return <div className="action-feedback-stack">
    {deliveries.map(row => {
      if (row.payload.kind !== 'points_refunded') return null;
      const feedback = row.payload;
      const event = actions.data?.events.find(item => item.id === row.event_id);
      if (!event || feedback.eventId !== event.id || feedback.recipientParticipantId !== scope.participantId) return null;
      const receipt: ActionReceipt = { commandId: event.id, relationshipId: scope.relationshipId, eventIds: [event.id], confirmedAt: event.recorded_at,
        balances: [{ participantId: feedback.recipientParticipantId, currency: feedback.currency, balance: feedback.balanceAfter }],
        availableRewardQuantities: [], refunds: [], feedback: [feedback] };
      return <ConfirmedActionFeedback key={`delivery:${event.id}`} activeScope={scope}
        enabled={enabled && settings.preferences.types.rewardRefunded}
        result={{ scope, state: { status: 'confirmed', receipt }, audience: { kind: 'recipient' } }}
        onDismiss={() => void ack(event.id)} />;
    })}
    {actions.confirmed.flatMap(entry => entry.state.status === 'confirmed' ? entry.state.receipt.feedback
      .filter(feedback => feedback.kind === 'points_refunded' && feedback.recipientParticipantId !== scope.participantId)
      .map(feedback => feedback.kind === 'points_refunded' && <ConfirmedActionFeedback
        key={`actor:${feedback.eventId}:${feedback.recipientParticipantId}`} activeScope={scope}
        enabled={enabled && settings.preferences.types.rewardRefunded}
        result={{ scope: entry.scope, state: entry.state, audience: { kind: 'actor_acknowledgement', recipientParticipantId: feedback.recipientParticipantId, recipientRole: feedback.currency } }} />) : [])}
    <div className="space-y-2 pointer-events-auto">
      {enabled && actions.confirmed.filter(entry => entry.state.status === 'confirmed' && !dismissed.has(entry.command.commandId)).map(entry => {
        if (entry.state.status !== 'confirmed' || entry.state.receipt.feedback.some(item => item.kind === 'points_refunded')) return null;
        const kind = entry.command.kind;
        const show = kind === 'reward_buy' || kind === 'reward_gift' ? settings.preferences.types.rewardPurchased : kind === 'reward_redeem' || kind === 'undo' ? settings.preferences.types.rewardRedeemed : settings.preferences.types.rewardRefunded;
        if (!show) return null;
        const text = { reward_buy: 'Purchase confirmed', reward_redeem: 'Use confirmed', reward_gift: 'Gift confirmed for your Sub', reward_delete: 'Reward deletion confirmed', undo: 'Undo confirmed' }[kind];
        return <div key={entry.command.commandId} role="status" className="rounded-lg border border-cyan-500 bg-navy p-4 text-white shadow-lg">
          <strong>{text}</strong><p className="text-sm">{entry.state.receipt.feedback[0]?.subjectTitle}</p>
          <button className="mt-2 text-sm underline" onClick={() => setDismissed(previous => new Set([...previous, entry.command.commandId]))}>Dismiss confirmation</button>
        </div>;
      })}
      {failed.filter(item => item.account === scope.accountId && item.period === scope.relationshipId).map(item => <div key={item.event} role="alert" className="rounded border border-amber-500 bg-navy p-3 text-white">
        <p>{item.message}</p><button className="underline" onClick={() => void ack(item.event)}>Retry dismissal</button>
      </div>)}
    </div>
  </div>;
}
