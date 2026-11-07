import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://archive.invalid', supabase: {} }));
import { useRetainedActivity } from '@/data/activityArchive/useRetainedActivity';
import { ActivityArchiveError } from '@/data/activityArchive/transport';
import { archiveId, archivePage, archiveRow, archiveScope as scope, deferredArchive, retainedPeriod } from './activity-archive.helpers';
const transport = { periods: vi.fn(), history: vi.fn() };
const otherPeriod = { ...retainedPeriod, periodId: archiveId(5), label: 'Deleted account' as const };
beforeEach(() => { transport.periods.mockReset().mockResolvedValue([retainedPeriod, otherPeriod]); transport.history.mockReset().mockResolvedValue(archivePage([archiveRow()])); });
afterEach(cleanup);
const setup = () => renderHook(({ currentScope = scope, enabled = true }) => useRetainedActivity(currentScope, 'task', enabled, transport), { initialProps: { currentScope: scope, enabled: true } });
describe('scoped retained-history state', () => {
  it('does not read closed History and fetches its first page only after an explicit earlier-period choice', async () => {
    const view = renderHook(({ enabled }) => useRetainedActivity(scope, 'task', enabled, transport), { initialProps: { enabled: false } });
    expect(transport.periods).not.toHaveBeenCalled(); expect(transport.history).not.toHaveBeenCalled();
    view.rerender({ enabled: true }); await waitFor(() => expect(view.result.current.periods).toHaveLength(2));
    expect(view.result.current.selected).toBeNull(); expect(transport.history).not.toHaveBeenCalled();
    act(() => view.result.current.select(retainedPeriod.periodId)); await waitFor(() => expect(view.result.current.rows).toHaveLength(1));
    expect(transport.history).toHaveBeenCalledWith(scope, retainedPeriod.periodId, 'task', null, expect.any(AbortSignal));
  });
  it('appends in server order, retains rows on a failed next page, and retries the exact cursor', async () => {
    transport.history.mockResolvedValueOnce(archivePage([archiveRow(1)], 'page-2')).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(archivePage([archiveRow(2)]));
    const view = setup(); await waitFor(() => expect(view.result.current.periods).toHaveLength(2));
    act(() => view.result.current.select(retainedPeriod.periodId)); await waitFor(() => expect(view.result.current.rows).toHaveLength(1));
    await act(async () => { await view.result.current.loadMore(); });
    expect(view.result.current.rows?.map(row => row.key)).toEqual([archiveRow(1).key]); expect(view.result.current.error).toBeTruthy();
    await act(async () => { await view.result.current.retryHistory(); });
    expect(view.result.current.rows?.map(row => row.key)).toEqual([archiveRow(1).key, archiveRow(2).key]);
    expect(transport.history.mock.calls.slice(1).map(call => call[3])).toEqual(['page-2', 'page-2']); expect(view.result.current.cursor).toBeNull();
  });
  it('refuses duplicate rows across pages without silently duplicating or discarding the prior page', async () => {
    transport.history.mockResolvedValueOnce(archivePage([archiveRow(1)], 'next')).mockResolvedValueOnce(archivePage([archiveRow(1)]));
    const view = setup(); await waitFor(() => expect(view.result.current.periods).toHaveLength(2));
    act(() => view.result.current.select(retainedPeriod.periodId)); await waitFor(() => expect(view.result.current.rows).toHaveLength(1));
    await act(async () => { await view.result.current.loadMore(); });
    expect(view.result.current.rows).toHaveLength(1); expect(view.result.current.error).toBeTruthy(); expect(view.result.current.cursor).toBe('next');
  });
  it('clears visible rows on selection and rejects late results from the previous selection', async () => {
    const old = deferredArchive<ReturnType<typeof archivePage>>(); transport.history.mockReturnValueOnce(old.promise).mockResolvedValueOnce(archivePage([archiveRow(2)], null, 'task', otherPeriod.periodId));
    const view = setup(); await waitFor(() => expect(view.result.current.periods).toHaveLength(2));
    act(() => view.result.current.select(retainedPeriod.periodId)); act(() => view.result.current.select(otherPeriod.periodId));
    expect(view.result.current.rows).toBeNull();
    await waitFor(() => expect(view.result.current.rows?.[0].key).toBe(archiveRow(2).key));
    await act(async () => { old.resolve(archivePage([archiveRow(1)])); });
    expect(view.result.current.rows?.map(row => row.key)).toEqual([archiveRow(2).key]); expect(transport.history.mock.calls[0][4].aborted).toBe(true);
  });
  it.each(['accountId', 'relationshipId', 'relationshipSessionId'] as const)('resets without flashing old rows when %s changes and ignores the old response after returning', async field => {
    const old = deferredArchive<ReturnType<typeof archivePage>>(); transport.history.mockReturnValue(old.promise);
    const view = setup(); await waitFor(() => expect(view.result.current.periods).toHaveLength(2)); act(() => view.result.current.select(retainedPeriod.periodId));
    view.rerender({ currentScope: { ...scope, [field]: archiveId(98) }, enabled: true });
    expect(view.result.current.selected).toBeNull(); expect(view.result.current.rows).toBeNull();
    view.rerender({ currentScope: scope, enabled: true });
    await act(async () => { old.resolve(archivePage([archiveRow()])); });
    expect(view.result.current.selected).toBeNull(); expect(view.result.current.rows).toBeNull();
  });
  it('clears a reactivated period and requires refreshed choices instead of replaying it', async () => {
    transport.history.mockResolvedValueOnce(archivePage([archiveRow()], 'next')).mockRejectedValueOnce(new ActivityArchiveError('RETAINED_PERIOD_NOT_ARCHIVED'));
    const view = setup(); await waitFor(() => expect(view.result.current.periods).toHaveLength(2)); act(() => view.result.current.select(retainedPeriod.periodId));
    await waitFor(() => expect(view.result.current.rows).toHaveLength(1)); await act(async () => { await view.result.current.loadMore(); });
    expect(view.result.current.rows).toBeNull(); expect(view.result.current.refreshRequired).toBe(true);
    await act(async () => { await view.result.current.retryHistory(); }); expect(transport.history).toHaveBeenCalledTimes(2);
    transport.periods.mockResolvedValue([]); await act(async () => { await view.result.current.reloadPeriods(); });
    expect(view.result.current.selected).toBeNull(); expect(view.result.current.periods).toEqual([]);
  });
});
