import { blocksNewAction } from '@/data/actions/contracts';
import { useState } from 'react';
import { useActionCommands } from '@/contexts/ActionCommandsContext';
import { useUserIds } from '@/contexts/UserIdsContext';
import { SavedActions } from '@/components/activity/SavedActions';
import { ActivityHistory } from '@/components/activity/ActivityHistory';
import { taskUndoReason, type TaskActionData } from '@/data/tasks/actionReadModel';

export function TaskActivity({ data }: { data: TaskActionData | undefined }) {
  const actions = useActionCommands();
  const identity = useUserIds();
  const [error, setError] = useState<string | null>(null);
  const busy = actions.entries.some(entry => blocksNewAction(entry, actions.scope));
  const undo = async (eventId: string) => { setError(null); try { await actions.enqueue({ kind: 'undo', eventId }); } catch (e) { setError(e instanceof Error ? e.message : 'Undo could not be saved.'); } };
  return <section className="mb-6 space-y-3 text-white" aria-label="Task actions">
    <SavedActions />
    {error && <p role="alert" className="text-amber-300">{error}</p>}
    <ActivityHistory domain="task" title="Task History">
      {!data ? <p className="mt-3">Loading confirmed history…</p> : <div className="mt-3 space-y-3">
        <p className="text-xs text-gray-300">Undo reverses the points recorded for that completion. Starting counts imported from the older app have no recorded award to reverse.</p>
        {data.events.length === 0 && <p>No recorded task events yet.</p>}
        {[...data.events].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at) || b.id.localeCompare(a.id)).map(event => {
          const reason = taskUndoReason(event, data.events, identity.currentRole, identity.permissions ?? {});
          const deleted = data.tasks.some(task => task.id === event.task_id && task.deleted_at);
          return <article key={event.id} className="border-t border-light-navy pt-3 text-sm">
            <p className="font-semibold">{event.kind === 'task_completed' ? 'Completed' : 'Undone'}: {event.subject.title}</p>
            <p>{event.subject.role === 'dom' ? 'Dom' : 'Sub'} task · <time dateTime={event.recorded_at}>{new Date(event.recorded_at).toLocaleString()}</time></p>
            <p>Recorded by: {event.actor_participant_id ? event.actor_participant_id === identity.participantId ? 'You' : 'Your partner' : 'Not recorded'}</p>
            {event.calendar && <p>Recorded for {event.calendar.localDate} in {event.calendar.timeZone}</p>}
            {data.points.filter(point => point.event_id === event.id).map(point => <p key={point.id}>{point.currency === 'dom' ? 'Dom' : 'Sub'} balance: {point.amount > 0 ? '+' : ''}{point.amount} points</p>)}
            {deleted && <p>Task removed from current cards; its history and corrections remain available.</p>}
            {event.reverses_event_id && <p>Correction of an earlier completion; the original record is preserved.</p>}
            {event.kind === 'task_completed' && <><button className="mt-2 underline disabled:opacity-50" disabled={!!reason || busy} onClick={() => void undo(event.id)}>Undo completion</button>{reason && <p className="text-gray-300">{reason}</p>}</>}
          </article>;
        })}
        {(data.imported ?? []).length > 0 && <div className="border-t border-light-navy pt-3">
          <h3 className="font-semibold">Imported task history</h3>
          <p className="text-xs text-gray-300">These original completion timestamps are preserved. Their actor, affected role, timezone, and awarded points were not reliably recorded, so they cannot be undone here.</p>
          {[...data.imported].sort((a, b) => b.completed_at.localeCompare(a.completed_at)).map(row => <article key={row.id} className="mt-3 text-sm">
            <p>Imported completion · Current task name: {data.tasks.find(task => task.id === row.task_id)?.title ?? 'Unavailable'}</p>
            <time dateTime={row.completed_at}>{row.completed_at}</time>
          </article>)}
        </div>}
      </div>}
    </ActivityHistory>
  </section>;
}
