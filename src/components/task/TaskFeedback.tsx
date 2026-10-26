import { useState } from 'react';
import { useActionCommands } from '@/contexts/ActionCommandsContext';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { acknowledgeRewardFeedback } from '@/data/rewards/actionReadModel';
import { useTaskActionData } from '@/data/tasks/actionReadModel';

/** Own recipient confirmations come from the durable outbox. An actor acting
 * for a partner sees only a local acknowledgment, never a claim of delivery. */
export function TaskFeedback() {
  const actions = useActionCommands();
  const settings = useNotificationSettings();
  const query = useTaskActionData(actions.scope, actions.mode === 'atomic');
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [failure, setFailure] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Set<string>>(() => new Set());
  const scope = actions.scope;
  if (!scope || actions.mode !== 'atomic' || settings.accountId !== scope.accountId || !settings.isReady ||
      !settings.preferences.enabled || !settings.preferences.types.taskCompleted) return null;
  const data = query.data;
  const events = data?.events ?? [];
  const key = (event: string) => `${scope.accountId}:${scope.relationshipId}:${event}`;
  const own = (actions.data?.deliveries ?? []).filter(delivery => delivery.kind === 'action_confirmed' &&
    delivery.recipient_participant_id === scope.participantId && !actions.data?.acknowledged.includes(delivery.event_id) && events.some(event => event.id === delivery.event_id));
  const ack = async (eventId: string) => {
    const id = key(eventId);
    setSaving(previous => new Set([...previous, id]));
    try {
      await acknowledgeRewardFeedback(scope, eventId, 'action_confirmed');
      setDismissed(previous => new Set([...previous, id]));
      setFailure(previous => { const next = { ...previous }; delete next[id]; return next; });
      await actions.refresh();
    } catch (error) { setFailure(previous => ({ ...previous, [id]: error instanceof Error ? error.message : 'Dismissal was not confirmed.' })); }
    finally { setSaving(previous => { const next = new Set(previous); next.delete(id); return next; }); }
  };
  const ownCards = own.filter(delivery => !dismissed.has(key(delivery.event_id))).map(delivery => {
    const event = events.find(value => value.id === delivery.event_id)!;
    return { id: event.id, title: event.subject.title, undo: event.kind === 'action_undone', recipient: true,
      points: (data?.points ?? []).filter(point => point.event_id === event.id).map(point => ({ currency: point.currency, amount: point.amount })) };
  });
  const partnerCards = actions.confirmed.flatMap(entry => {
    const command = entry.command;
    if (entry.state.status !== 'confirmed' || (entry.command.kind !== 'task_complete' && !(command.kind === 'undo' && events.some(event => event.id === command.eventId)))) return [];
    const receipt = entry.state.receipt;
    const feedback = receipt.feedback.find(item => item.kind === 'action_confirmed' && item.recipientParticipantId !== scope.participantId);
    if (!feedback || dismissed.has(key(feedback.eventId))) return [];
    return [{ id: feedback.eventId, title: feedback.subjectTitle, undo: entry.command.kind === 'undo', recipient: false, points: receipt.pointDeltas ?? [] }];
  });
  return <div className="space-y-2 pointer-events-auto">
    {[...ownCards, ...partnerCards].map(card => <article key={card.id} role="status" className="rounded-lg border border-cyan-500 bg-navy p-4 text-white shadow-lg motion-safe:animate-fade-in">
      <strong>{card.undo ? 'Task Undo confirmed' : 'Task completion confirmed'}</strong>
      <p className="text-sm">{card.title}</p>
      {card.points.map((point, index) => <p key={index}>{point.currency === 'dom' ? 'Dom' : 'Sub'} balance: {point.amount > 0 ? '+' : ''}{point.amount} points{card.recipient ? '' : ' for your partner'}</p>)}
      {card.points.length === 0 && <p>No points changed.</p>}
      {failure[key(card.id)] && <p role="alert">{failure[key(card.id)]}</p>}
      <button className="mt-2 text-sm underline disabled:opacity-50" disabled={saving.has(key(card.id))}
        onClick={() => card.recipient ? void ack(card.id) : setDismissed(previous => new Set([...previous, key(card.id)]))}>
        {saving.has(key(card.id)) ? 'Confirming dismissal…' : failure[key(card.id)] ? 'Retry dismissal' : 'Dismiss task confirmation'}
      </button>
    </article>)}
  </div>;
}
