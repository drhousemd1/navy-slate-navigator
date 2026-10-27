import { SavedActions } from '@/components/activity/SavedActions';
import { useState } from 'react';
import { useActionCommands } from '@/contexts/ActionCommandsContext';
import { useUserIds } from '@/contexts/UserIdsContext';
import { rewardUndoReason } from '@/data/rewards/actionReadModel';

const labels: Record<string, string> = { reward_buy: 'Buy', reward_redeem: 'Use', reward_gift: 'Gift', reward_delete: 'Delete', undo: 'Undo',
  reward_purchased: 'Purchased', reward_redeemed: 'Used', reward_gifted: 'Gifted', reward_deleted: 'Deleted', action_undone: 'Undone', opening_inventory: 'Starting inventory' };
export function RewardActivity() {
  const actions = useActionCommands();
  const identity = useUserIds();
  const [error, setError] = useState<string | null>(null);
  const perform = async (operation: () => Promise<void>) => { setError(null); try { await operation(); } catch (e) { setError(e instanceof Error ? e.message : 'Action could not be saved.'); } };
  const pending = actions.entries.filter(entry => entry.state.status !== 'confirmed');
  const busy = pending.some(entry => entry.canReplay && ['pending', 'sending', 'confirmation_unknown'].includes(entry.state.status));
  if (actions.mode === 'legacy') return null;
  return <section className="mb-6 space-y-3 text-white" aria-label="Reward actions">
    {(actions.error || error) && <div role="alert" className="rounded border border-amber-500 bg-navy p-3"><p>{error || actions.error}</p><button className="underline" onClick={() => void perform(actions.refresh)}>Refresh confirmed data</button></div>}
    <SavedActions />
    {actions.mode === 'atomic' && <details className="rounded border border-light-navy bg-navy p-3">
      <summary className="cursor-pointer font-semibold">Reward History</summary>
      {!actions.data ? <p className="mt-3">Loading confirmed history…</p> : <div className="mt-3 space-y-3">
        {actions.data.events.length === 0 && <p>No new reward events yet.</p>}
        {[...actions.data.events].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at) || b.id.localeCompare(a.id)).map(event => {
          const reason = rewardUndoReason(event, actions.data!, identity.participantId!, identity.currentRole!, identity.permissions ?? {});
          const reversible = ['reward_purchased', 'reward_redeemed'].includes(event.kind);
          const points = actions.data!.points.filter(item => item.event_id === event.id);
          return <article key={event.id} className="border-t border-light-navy pt-3 text-sm">
            <p className="font-semibold">{labels[event.kind] ?? event.kind}: {event.subject.title}</p>
            <p>{event.subject.role ? `${event.subject.role === 'dom' ? 'Dom' : 'Sub'} reward · ` : ''}<time dateTime={event.recorded_at}>{new Date(event.recorded_at).toLocaleString()}</time></p>
            {event.calendar && <p>Recorded for {event.calendar.localDate} in {event.calendar.timeZone}</p>}
            {points.map(point => <p key={point.id}>{point.currency === 'dom' ? 'Dom' : 'Sub'} balance: {point.amount > 0 ? '+' : ''}{point.amount} points</p>)}
            {event.provenance === 'legacy_import' && <p>Imported starting inventory; original purchase prices were not recorded.</p>}
            {event.reverses_event_id && <p>Correction of an earlier event; the original record is preserved.</p>}
            {reversible && <><button className="mt-2 underline disabled:opacity-50" disabled={!!reason || busy} onClick={() => void perform(() => actions.enqueue({ kind: 'undo', eventId: event.id }))}>Undo {event.kind === 'reward_purchased' ? 'purchase' : 'Use'}</button>{reason && <p className="text-gray-300">{reason}</p>}</>}
          </article>;
        })}
        {actions.data.importedUsage.length > 0 && <section aria-label="Imported reward-use history" className="border-t border-light-navy pt-3 space-y-3">
          <h3 className="font-semibold">Imported reward-use history</h3>
          <p className="text-xs text-gray-300">These older records describe saved Use status, not purchases. Original price, reward role, actor, point effects and timezone were not reliably recorded. Current titles are references, not historical snapshots. These entries are read-only and cannot be undone.</p>
          {[...actions.data.importedUsage].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || b.id.localeCompare(a.id)).map(row => <article key={row.id} className="border-t border-light-navy pt-3 text-sm">
            <p className="font-semibold">Imported reward-use record</p>
            <p>{row.currentTitle ? `Current title: ${row.currentTitle}` : 'Original reward title is unavailable.'}</p>
            <p>Saved timestamp: {row.created_at ? <time dateTime={row.created_at}>{row.created_at}</time> : 'Not recorded'}</p>
            <p>Saved status: {row.used === true ? 'Used' : row.used === false ? 'Not marked used' : 'Not recorded'}</p>
          </article>)}
        </section>}
      </div>}
    </details>}
  </section>;
}
