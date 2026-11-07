import { useCallback, useEffect, useRef, useState } from 'react';
import { activityArchiveTransport, archiveContextExpired, archiveErrorText, archiveNeedsRefresh, type ActivityArchiveTransport } from './transport';
import { archiveScopeKey, type ActivityArchiveScope, type ActivityDomain, type RetainedActivityPeriod, type RetainedActivityRow } from './types';

interface View { key: string }
interface State {
  view: View; periods: RetainedActivityPeriod[] | null; periodsLoading: boolean; periodsError: string | null; periodsIdentityRefreshRequired: boolean;
  selected: string | null; rows: RetainedActivityRow[] | null; cursor: string | null; usedCursors: string[];
  loading: boolean; error: string | null; refreshRequired: boolean; identityRefreshRequired: boolean;
}
const blank = (view: View): State => ({ view, periods: null, periodsLoading: false, periodsError: null, periodsIdentityRefreshRequired: false,
  selected: null, rows: null, cursor: null, usedCursors: [], loading: false, error: null, refreshRequired: false, identityRefreshRequired: false });

export function useRetainedActivity(scope: ActivityArchiveScope | null, domain: ActivityDomain, enabled: boolean, transport: ActivityArchiveTransport = activityArchiveTransport) {
  const key = JSON.stringify([archiveScopeKey(scope), domain, enabled]);
  const current = useRef<View>({ key });
  const listRequest = useRef<AbortController | null>(null); const pageRequest = useRef<AbortController | null>(null);
  if (current.current.key !== key) {
    listRequest.current?.abort(); pageRequest.current?.abort(); listRequest.current = null; pageRequest.current = null;
    current.current = { key };
  }
  const view = current.current;
  const [stored, setState] = useState<State>(() => blank(view));
  const state = stored.view === view ? stored : blank(view);
  const latest = useRef(state); latest.current = state;
  // Capture the scoped values without restarting reads on unrelated renders.
  const activeScope = useRef(scope); activeScope.current = scope;
  const reloadPeriods = useCallback(async () => {
    const expected = activeScope.current;
    if (!expected || !enabled || current.current !== view || listRequest.current) return;
    pageRequest.current?.abort(); pageRequest.current = null;
    const controller = new AbortController(); listRequest.current = controller;
    setState({ ...blank(view), periodsLoading: true });
    try {
      const periods = await transport.periods(expected, controller.signal);
      if (current.current === view && !controller.signal.aborted) setState({ ...blank(view), periods });
    } catch (error) {
      if (current.current === view && !controller.signal.aborted) setState({ ...blank(view), periodsError: archiveErrorText(error), periodsIdentityRefreshRequired: archiveContextExpired(error) });
    } finally { if (listRequest.current === controller) listRequest.current = null; }
  }, [enabled, transport, view]);
  useEffect(() => {
    void reloadPeriods();
    return () => { listRequest.current?.abort(); pageRequest.current?.abort(); listRequest.current = null; pageRequest.current = null; };
  }, [reloadPeriods]);

  const read = async (periodId: string, append: boolean) => {
    const expected = activeScope.current; const before = latest.current;
    if (!expected || !enabled || current.current !== view || !before.periods?.some(period => period.periodId === periodId) || listRequest.current) return;
    if (append && (pageRequest.current || before.selected !== periodId || !before.cursor || before.refreshRequired)) return;
    pageRequest.current?.abort();
    const controller = new AbortController(); pageRequest.current = controller;
    const cursor = append ? before.cursor : null;
    const rows = append ? before.rows ?? [] : [];
    const used = append ? before.usedCursors : [];
    setState({ ...before, view, selected: periodId, rows: append ? rows : null, cursor, usedCursors: used, loading: true, error: null, refreshRequired: false, identityRefreshRequired: false });
    try {
      const page = await transport.history(expected, periodId, domain, cursor, controller.signal);
      const keys = new Set(rows.map(row => row.key));
      if (page.rows.some(row => keys.has(row.key)) || page.nextCursor && (page.nextCursor === cursor || used.includes(page.nextCursor))) throw new Error('INVALID_ACTIVITY_PAGINATION');
      if (current.current === view && pageRequest.current === controller && !controller.signal.aborted) {
        setState(previous => ({ ...previous, rows: [...rows, ...page.rows], cursor: page.nextCursor, usedCursors: cursor ? [...used, cursor] : used, loading: false, error: null }));
      }
    } catch (error) {
      if (current.current === view && pageRequest.current === controller && !controller.signal.aborted) {
        const refreshRequired = archiveNeedsRefresh(error);
        setState(previous => ({ ...previous, rows: refreshRequired ? null : append ? rows : null, loading: false, error: archiveErrorText(error), refreshRequired, identityRefreshRequired: archiveContextExpired(error) }));
      }
    } finally { if (pageRequest.current === controller) pageRequest.current = null; }
  };
  const select = (periodId: string | null) => {
    if (current.current !== view) return;
    if (periodId) { void read(periodId, false); return; }
    pageRequest.current?.abort(); pageRequest.current = null;
    setState(previous => ({ ...(previous.view === view ? previous : blank(view)), selected: null, rows: null, cursor: null, usedCursors: [], loading: false, error: null, refreshRequired: false, identityRefreshRequired: false }));
  };
  return { ...state, available: !!scope, reloadPeriods, select,
    loadMore: () => state.selected ? read(state.selected, true) : Promise.resolve(),
    retryHistory: () => state.selected && !state.refreshRequired ? read(state.selected, !!state.rows?.length && !!state.cursor) : Promise.resolve(),
  };
}
