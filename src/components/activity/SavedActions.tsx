import { useState } from 'react';
import { useActionCommands } from '@/contexts/ActionCommandsContext';
import { actionLabels, savedActionStatus } from '@/lib/offline/action-status';
/** Shared durable queue: domain pages never implement a second retry path. */
export function SavedActions() {
  const actions = useActionCommands();
  const [error, setError] = useState<string | null>(null);
  const pending = actions.entries.filter(entry => entry.state.status !== 'confirmed');
  const perform = async (operation: () => Promise<void>) => { setError(null); try { await operation(); } catch (e) { setError(e instanceof Error ? e.message : 'Action could not be saved.'); } };
  if (actions.mode === 'legacy') return null;
  return <>
    {error && <p role="alert" className="text-amber-300">{error}</p>}
    {pending.length > 0 && <div className="rounded border border-light-navy bg-navy p-3 space-y-3 text-white">
      <h2 className="font-semibold">Saved actions</h2>
      {pending.map(entry => <div key={entry.command.commandId} className="border-t border-light-navy pt-2 text-sm">
        <p><strong>{actionLabels[entry.command.kind] ?? 'Action'}</strong> — {savedActionStatus(entry.state.status)}</p>
        {entry.problem && <p>{entry.problem.message}</p>}
        {!entry.canReplay && <p>This belongs to an earlier relationship period and will not be sent here.</p>}
        {entry.canReplay && entry.state.status !== 'sending' && <button className="mr-4 underline" onClick={() => void perform(() => actions.retry(entry.command.commandId))}>Retry same action</button>}
        {entry.canCancel && <button className="underline" onClick={() => void perform(() => actions.cancelUnsent(entry.command.commandId))}>Cancel unsent action</button>}
      </div>)}
      <p className="text-xs text-gray-300">Balances and progress change only after server confirmation. Retrying keeps the same action ID.</p>
      <p className="text-xs text-gray-300">Automatic retries are limited. If an action remains pending, retry the same action after your connection returns.</p>
    </div>}
  </>;
}
