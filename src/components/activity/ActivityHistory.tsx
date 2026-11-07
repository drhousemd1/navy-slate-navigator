import { useCoreTextClasses } from '@/components/common/useCoreTextClasses';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useUserIds } from '@/contexts/UserIdsContext';
import { supabaseBackendId } from '@/integrations/supabase/client';
import { useRetainedActivity } from '@/data/activityArchive/useRetainedActivity';
import { archiveScopeKey, type ActivityArchiveScope, type ActivityDomain } from '@/data/activityArchive/types';
import { RetainedActivityRows } from './RetainedActivityRows';

/** Earlier periods live inside the existing History surface. Current actions,
 * balances, feedback and SavedActions remain owned by their existing parents. */
export function ActivityHistory({ domain, title, children }: { domain: ActivityDomain; title: string; children: ReactNode }) {
  const text = useCoreTextClasses();
  const identity = useUserIds();
  const scope: ActivityArchiveScope | null = identity.canAccessData && !identity.isLoadingUserIds && identity.currentUserId && identity.relationshipId && identity.relationshipSessionId
    ? { backendId: supabaseBackendId, accountId: identity.currentUserId, relationshipId: identity.relationshipId, relationshipSessionId: identity.relationshipSessionId } : null;
  const [open, setOpen] = useState(false);
  const history = useRetainedActivity(scope, domain, open);
  const key = archiveScopeKey(scope); const currentView = useRef({ key });
  if (currentView.current.key !== key) currentView.current = { key };
  const view = currentView.current;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [recovery, setRecovery] = useState<{ view: typeof view; loading: boolean; error: string | null } | null>(null);
  const recovering = recovery?.view === view && recovery.loading;
  const recoverConnection = async () => {
    if (recovering) return;
    const isCurrent = () => mounted.current && currentView.current === view;
    setRecovery({ view, loading: true, error: null });
    try {
      await identity.initializeUserIds();
      // A changed provider scope starts its own fresh list read. A still-current
      // scope also needs new choices, for example after membership was repaired.
      if (isCurrent()) await history.reloadPeriods();
    } catch { if (isCurrent()) setRecovery({ view, loading: false, error: 'Your current connection could not be refreshed. Retry when your connection is available.' }); return; }
    if (isCurrent()) setRecovery({ view, loading: false, error: null });
  };
  const selectId = useId();
  return <details className="rounded border border-light-navy bg-navy p-3" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer font-semibold">{title}</summary>
    {open && <div className="mt-3 space-y-2">
      <label className="block text-sm" htmlFor={selectId}>History period</label>
      <select id={selectId} className={`w-full rounded border border-light-navy bg-dark-navy p-2 text-sm ${text.primary}`} value={history.selected ?? 'current'} onChange={event => history.select(event.target.value === 'current' ? null : event.target.value)}>
        <option value="current">Current relationship</option>
        {(history.periods ?? []).map((period, index) => <option key={period.periodId} value={period.periodId}>{period.label} · {period.startedAt.slice(0, 10)}{period.endedAt ? ` to ${period.endedAt.slice(0, 10)}` : ''} · Period {index + 1}</option>)}
      </select>
      {!history.available && <p className={`text-sm ${text.secondary}`}>Earlier periods are available after your current account connection is verified.</p>}
      {history.periodsLoading && <p role="status" className={`text-sm ${text.secondary}`}>Loading earlier period choices…</p>}
      {recovering && <p role="status">Refreshing your current connection…</p>}
      {recovery?.view === view && recovery.error && <p role="alert" className={`text-sm ${text.warning}`}>{recovery.error}</p>}
      {history.periodsError && <div role="alert" className={`text-sm ${text.warning}`}><p>{history.periodsError}</p><button className="underline disabled:opacity-50" disabled={recovering} onClick={() => void (history.periodsIdentityRefreshRequired ? recoverConnection() : history.reloadPeriods())}>{history.periodsIdentityRefreshRequired ? 'Refresh connection and period choices' : 'Retry period choices'}</button></div>}
      {history.periods?.length === 0 && <p className={`text-sm ${text.secondary}`}>No earlier periods are available for this account.</p>}
      {history.selected && <section aria-label="Earlier activity history" className="space-y-3 pt-2">
        <p className={`text-xs ${text.secondary}`}>Read-only history from this earlier period. Former partner identities are masked; titles and other text may still contain identifying details. These records do not change current balances.</p>
        {history.loading && <p role="status">{history.rows ? 'Loading more history…' : 'Loading earlier history…'}</p>}
        {history.error && <div role="alert" className={text.warning}><p>{history.error}</p><button className="underline disabled:opacity-50" disabled={history.loading || recovering} onClick={() => void (history.identityRefreshRequired ? recoverConnection() : history.refreshRequired ? history.reloadPeriods() : history.retryHistory())}>{history.identityRefreshRequired ? 'Refresh connection and period choices' : history.refreshRequired ? 'Reload period choices' : 'Retry earlier history'}</button></div>}
        {history.rows?.length === 0 && !history.loading && !history.error && <p>No {domain} activity was recorded in this earlier period.</p>}
        {history.rows && <RetainedActivityRows rows={history.rows} domain={domain} />}
        {history.cursor && !history.error && <button className="underline disabled:opacity-50" disabled={history.loading} onClick={() => void history.loadMore()}>Load more history</button>}
      </section>}
    </div>}
    {!history.selected && children}
  </details>;
}
