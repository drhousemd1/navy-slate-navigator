import { useCoreTextClasses } from '@/components/common/useCoreTextClasses';
import { useEffect, useRef, useState } from 'react';
import { useActionCommands } from '@/contexts/ActionCommandsContext';
import { actionLabels, savedActionStatus } from '@/lib/offline/action-status';
import { scopeKey, needsContextReview, hasExpectedContext } from '@/data/actions/contracts';
/** Shared durable queue: domain pages never implement a second retry path. */
export function SavedActions() {
  const text = useCoreTextClasses();
  const actions = useActionCommands();
  const key = actions.scope ? scopeKey(actions.scope) : '';
  const currentView = useRef({ key });
  if (currentView.current.key !== key) currentView.current = { key };
  const view = currentView.current;
  const [error, setError] = useState<{ view: typeof view; message: string } | null>(null);
  const [notice, setNotice] = useState<{ view: typeof view; message: string } | null>(null);
  const [checking, setChecking] = useState<{ view: typeof view; id: string } | null>(null);
  const checkingId = checking?.view === view ? checking.id : null;
  useEffect(() => { setError(null); setNotice(null); setChecking(null); }, [key]);
  const pending = actions.entries.filter(entry => entry.state.status !== 'confirmed');
  const perform = async (operation: () => Promise<void>) => {
    const expected = view; setError(null);
    try { await operation(); }
    catch (error) { if (currentView.current === expected) setError({ view: expected, message: error instanceof Error ? error.message : 'Action could not be saved.' }); }
  };
  const reconcile = async (id: string) => {
    const expected = view; setChecking({ view: expected, id }); setError(null); setNotice(null);
    try {
      const result = await actions.reconcile(id);
      if (currentView.current === expected) setNotice({ view: expected, message: result === 'confirmed'
        ? 'This action was already completed. It has not been repeated.'
        : 'No saved confirmation was found. This action remains saved and will not be sent again.' });
    } catch (error) { if (currentView.current === expected) setError({ view: expected, message: error instanceof Error ? error.message : 'The result could not be checked.' }); }
    finally { if (currentView.current === expected) setChecking(null); }
  };
  if (actions.mode === 'legacy') return null;
  return <>
    {error?.view === view && <p role="alert" className={text.warning}>{error.message}</p>}
    {notice?.view === view && <p role="status" className={`text-sm ${text.secondary}`}>{notice.message}</p>}
    {pending.length > 0 && <div className={`rounded border border-light-navy bg-navy p-3 space-y-3 ${text.primary}`}>
      <h2 className="font-semibold">Saved actions</h2>
      {pending.map(entry => <div key={entry.command.commandId} className="border-t border-light-navy pt-2 text-sm">
        <p><strong>{actionLabels[entry.command.kind] ?? 'Action'}</strong> — {savedActionStatus(entry.state.status, !entry.canReplay)}</p>
        {entry.problem && <p>{entry.problem.message}</p>}
        {!entry.canReplay && <p>{needsContextReview(entry) ? (hasExpectedContext(entry.command) ? 'These reviewed details changed. This saved action will not be sent again.' : 'This older action does not include the details originally reviewed. It will not be sent again.') : entry.scope.relationshipSessionId ? 'Saved before your connection changed or was reconnected. It will not be sent again.' : 'This older saved action cannot be sent again here. You can check whether it was already completed.'}</p>}
        {actions.scope && scopeKey(entry.scope) === scopeKey(actions.scope) && needsContextReview(entry) && (entry.state.status === 'rejected' || (entry.state.status === 'pending' && !entry.everSent)) &&
          <a className="mr-4 underline" href={entry.command.kind === 'task_complete' ? '/tasks' : entry.command.kind === 'rule_violation' ? '/rules' : '/punishments'}>Review current details</a>}
        {needsContextReview(entry) && ['sending', 'confirmation_unknown'].includes(entry.state.status) &&
          <p>Check the result before taking another action. An unknown result is not a failed action.</p>}
        {entry.canReconcile && <button disabled={checkingId !== null} className="mr-4 underline disabled:opacity-50" onClick={() => void reconcile(entry.command.commandId)}>{checkingId === entry.command.commandId ? 'Checking result…' : 'Check result'}</button>}
        {entry.canReplay && entry.state.status !== 'sending' && <button className="mr-4 underline" onClick={() => void perform(() => actions.retry(entry.command.commandId))}>Retry same action</button>}
        {entry.canCancel && <button className="underline" onClick={() => void perform(() => actions.cancelUnsent(entry.command.commandId))}>Cancel unsent action</button>}
      </div>)}
      <p className={`text-xs ${text.secondary}`}>Balances and progress change only after server confirmation. Retrying checks the original action without creating another one.</p>
      <p className={`text-xs ${text.secondary}`}>Automatic retries are limited. Use Retry same action where available after your connection returns.</p>
    </div>}
  </>;
}
