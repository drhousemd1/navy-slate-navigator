import { useState } from 'react';
import { useActionCommands } from '@/contexts/ActionCommandsContext';
import { useUserIds } from '@/contexts/UserIdsContext';
import { SavedActions } from '@/components/activity/SavedActions';
import { recordingUndoReason, type RecordingData, type RecordingType } from '@/data/recordings/readModel';

export function RecordingActivity({ type, data, error, refresh }: { type: RecordingType; data?: RecordingData; error?: string; refresh: () => Promise<void> }) {
  const actions = useActionCommands();
  const identity = useUserIds();
  const [operationError, setOperationError] = useState<string | null>(null);
  const perform = async (operation: () => Promise<void>) => { setOperationError(null); try { await operation(); } catch (e) { setOperationError(e instanceof Error ? e.message : 'The action could not be saved.'); } };
  const busy = actions.entries.some(entry => entry.canReplay && ['pending', 'sending', 'confirmation_unknown'].includes(entry.state.status));
  const latest = [...actions.confirmed].reverse().find(entry => {
    const command = entry.command;
    if (command.kind === 'rule_violation') return true;
    if (command.kind === 'punishment_apply') return type === 'punishment';
    if (command.kind !== 'undo' || entry.state.status !== 'confirmed') return false;
    const original = data?.events.find(event => event.id === command.eventId);
    // The receipt also identifies the activity while refreshed History is loading,
    // including a rule Undo followed by the preserved Rules → Punishments route.
    const subjectType = entry.state.receipt.recordingProgress?.subjectType;
    return original?.kind === 'rule_violated' || subjectType === 'rule' ||
      (type === 'punishment' && (original?.kind === 'punishment_applied' || subjectType === 'punishment'));
  });
  const title = type === 'rule' ? 'Rule' : 'Punishment';
  return <section className="mb-6 space-y-3 text-white" aria-label={`${title} activity`}>
    <SavedActions />
    {(error || operationError) && <div role="alert" className="rounded border border-amber-500 bg-navy p-3"><p>{operationError || error}</p><button className="underline" onClick={() => void perform(refresh)}>Refresh confirmed data</button></div>}
    {latest?.state.status === 'confirmed' && <div role="status" className="rounded border border-cyan-500 bg-navy p-3">
      <strong>{latest.command.kind === 'undo' ? 'Undo confirmed' : latest.command.kind === 'rule_violation' ? 'Rule violation recorded' : 'Punishment recorded'}</strong>
      <p>{latest.state.receipt.feedback[0]?.subjectTitle}</p>
      {latest.state.receipt.pointDeltas?.map(delta => <p key={delta.participantId}>{delta.currency === 'dom' ? 'Dom' : 'Sub'}: {delta.amount > 0 ? '+' : ''}{delta.amount} points</p>)}
    </div>}
    <details className="rounded border border-light-navy bg-navy p-3">
      <summary className="cursor-pointer font-semibold">{title} History</summary>
      {!data ? <p className="mt-3">Loading confirmed history…</p> : <div className="mt-3 space-y-3">
        {data.events.length === 0 && <p>No new {type === 'rule' ? 'rule violations' : 'punishments'} recorded yet.</p>}
        <p className="text-xs text-gray-300">Undo is available for new activity with verified point and history details. Imported records are shown below as read-only history.</p>
        {[...data.events].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at) || b.id.localeCompare(a.id)).map(event => {
          const reason = recordingUndoReason(event, data.events, identity.currentRole!, identity.permissions ?? {});
          const reversible = ['rule_violated', 'punishment_applied'].includes(event.kind);
          const actor = event.actor_participant_id === identity.participantId ? 'You' : 'Your partner';
          return <article key={event.id} className="border-t border-light-navy pt-3 text-sm">
            <p className="font-semibold">{event.kind === 'action_undone' ? 'Undone' : type === 'rule' ? 'Rule broken' : 'Punishment recorded'}: {event.subject.title}</p>
            <p>{actor} recorded this · <time dateTime={event.recorded_at}>{new Date(event.recorded_at).toLocaleString()}</time></p>
            {event.calendar && <p>Recorded for {event.calendar.localDate} in {event.calendar.timeZone}</p>}
            {data.points.filter(point => point.event_id === event.id).map(point => <div key={point.id}><p>{point.currency === 'dom' ? 'Dom' : 'Sub'} balance: {point.amount > 0 ? '+' : ''}{point.amount} points</p>
              {point.calendar && (point.calendar.timeZone !== event.calendar?.timeZone || point.calendar.localDate !== event.calendar?.localDate) && <p>{point.currency === 'dom' ? 'Dom' : 'Sub'} calendar: {point.calendar.localDate} in {point.calendar.timeZone}</p>}</div>)}
            {event.reverses_event_id && <p>Correction of an earlier event; the original remains in History.</p>}
            {reversible && <><button className="mt-2 underline disabled:opacity-50" disabled={!!reason || busy} onClick={() => void perform(() => actions.enqueue({ kind: 'undo', eventId: event.id }))}>Undo {type === 'rule' ? 'violation' : 'punishment'}</button>{reason && <p className="text-gray-300">{reason}</p>}</>}
          </article>;
        })}
        {data.imported.length > 0 && <section aria-label="Imported history" className="border-t border-light-navy pt-3 space-y-3">
          <h3 className="font-semibold">Imported history</h3>
          <p className="text-xs text-gray-300">These are the original saved records. The original actor, point effects and timezone were not reliably recorded, so these entries cannot be undone. Current titles are references, not historical snapshots.</p>
          {[...data.imported].sort((a, b) => (b.violation_date ?? b.applied_date ?? '').localeCompare(a.violation_date ?? a.applied_date ?? '') || b.id.localeCompare(a.id)).map(row => {
            const timestamp = row.violation_date ?? row.applied_date;
            return <article key={row.id} className="border-t border-light-navy pt-3 text-sm">
              <p className="font-semibold">Imported {type === 'rule' ? 'rule violation' : 'punishment'}</p>
              <p>{row.currentTitle ? `Current title: ${row.currentTitle}` : 'Original definition is no longer available.'}</p>
              <p>Saved timestamp: {timestamp ? <time dateTime={timestamp}>{timestamp}</time> : 'Not recorded'}</p>
              {row.points_deducted !== undefined && <p>Saved deduction: {row.points_deducted} points (legacy value; actual balance change unverified).</p>}
            </article>;
          })}
        </section>}
      </div>}
    </details>
  </section>;
}
