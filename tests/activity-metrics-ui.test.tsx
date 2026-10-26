import React from 'react';
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWeeklyMetrics } from '@/data/queries/metrics/useWeeklyMetrics';
import { useWeeklyMetricsSummary } from '@/data/queries/useWeeklyMetricsSummary';
import UnifiedMetricsTiles from '@/components/throne/UnifiedMetricsTiles';
import { ActivityMetricsNotice } from '@/components/throne/ActivityMetricsNotice';
import { metricRange, projectActivity, type MetricsSource, type MetricEvent } from '@/data/metrics/projection';
import { scope, uuid } from './action-queue.helpers';

const mocks = vi.hoisted(() => ({ commands: { scope: null as unknown, mode: 'atomic', error: null },
  identity: { subUserId: '', domUserId: null, timezone: 'UTC' }, clocks: vi.fn(), source: vi.fn() }));
vi.mock('@/contexts/ActionCommandsContext', () => ({ useActionCommands: () => mocks.commands }));
vi.mock('@/contexts/UserIdsContext', () => ({ useUserIds: () => mocks.identity }));
vi.mock('@/data/metrics/readModel', () => ({ METRICS_QUERY_KEY: ['activity-metrics'], metricsScopeKey: (value: typeof scope | null) => [value?.backendId, value?.accountId, value?.participantId, value?.relationshipId],
  readMetricClocks: (...args: unknown[]) => mocks.clocks(...args), readMetricsSource: (...args: unknown[]) => mocks.source(...args) }));
const source = (events: MetricEvent[] = []): MetricsSource => ({ mode: 'atomic', events, legacy: [] });
const saved = (date: string): MetricEvent => ({ id: date, kind: 'task_completed', relationship_id: scope.relationshipId, beneficiary_participant_id: scope.participantId,
  subject: { role: 'sub' }, calendar: { participantId: scope.participantId, localDate: date, weekStartDate: metricRange('week', 'sub', 'UTC', new Date(`${date}T12:00:00Z`)).start, timeZone: 'UTC' }, reverses_event_id: null });
const clients: QueryClient[] = [];
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  return ({ children }: React.PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  mocks.commands = { scope: { ...scope }, mode: 'atomic', error: null };
  mocks.identity = { subUserId: scope.accountId, domUserId: null, timezone: 'UTC' };
  mocks.clocks.mockResolvedValue([{ role: 'sub', timeZone: 'UTC' }]);
  mocks.source.mockResolvedValue(source());
});
afterEach(() => { cleanup(); clients.forEach(client => client.clear()); clients.length = 0; vi.useRealTimers(); });

describe('shared Throne query and visible result states', () => {
  it('uses one source request for weekly bars and totals, with identical counts', async () => {
    const today = new Date().toISOString().slice(0, 10);
    mocks.source.mockResolvedValue(source([saved(today)]));
    const { result } = renderHook(() => ({ bars: useWeeklyMetrics(), totals: useWeeklyMetricsSummary() }), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.totals.data?.subTasksCompleted).toBe(1));
    expect(result.current.bars.data?.reduce((sum, row) => sum + row.subTasksCompleted, 0)).toBe(1);
    expect(mocks.source).toHaveBeenCalledTimes(1); expect(mocks.clocks).toHaveBeenCalledTimes(1);
  });
  it('does not query before the accounting/identity mode is known', () => {
    mocks.commands.mode = 'loading';
    const { result } = renderHook(() => useWeeklyMetrics(), { wrapper: wrapper() });
    expect(result.current.isLoading).toBe(true); expect(result.current.data).toBeUndefined();
    expect(mocks.source).not.toHaveBeenCalled(); expect(mocks.clocks).not.toHaveBeenCalled();
  });
  it('shows denied reads as unavailable, not six zeros, and Retry recovers', async () => {
    mocks.source.mockRejectedValue(new Error('History access denied.'));
    render(<UnifiedMetricsTiles isMonthlyView={false} />, { wrapper: wrapper() });
    expect(screen.getByRole('status').textContent).toContain('Loading');
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toContain('unavailable');
    expect(screen.queryByText('Sub Tasks Completed:')).toBeNull();
    mocks.source.mockResolvedValue(source());
    await userEvent.click(screen.getByRole('button', { name: 'Retry activity' }));
    await screen.findByText('Sub Tasks Completed:');
    expect(screen.getAllByText('0')).toHaveLength(6);
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('loads only the selected weekly/monthly view and preserves all six labels when toggled', async () => {
    const component = render(<UnifiedMetricsTiles isMonthlyView={false} />, { wrapper: wrapper() });
    await screen.findByText('Sub Rewards Redeemed:'); expect(mocks.source).toHaveBeenCalledTimes(1);
    component.rerender(<UnifiedMetricsTiles isMonthlyView />);
    await screen.findByText('Dom Tasks Completed:');
    expect(mocks.source).toHaveBeenCalledTimes(2); expect(mocks.clocks).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('0')).toHaveLength(6);
  });
  it('cannot display a late previous-account result after the account/period changes', async () => {
    let release!: (data: MetricsSource) => void;
    mocks.source.mockImplementation((value: typeof scope) => value.accountId === scope.accountId ? new Promise<MetricsSource>(resolve => { release = resolve; }) : Promise.resolve(source()));
    const { result, rerender } = renderHook(() => useWeeklyMetricsSummary(), { wrapper: wrapper() });
    await waitFor(() => expect(release).toBeDefined());
    mocks.commands.scope = { ...scope, accountId: uuid(90), relationshipId: uuid(91), participantId: uuid(92) };
    mocks.identity.subUserId = uuid(90); rerender();
    await waitFor(() => expect(result.current.data?.subTasksCompleted).toBe(0));
    await act(async () => release(source([saved(new Date().toISOString().slice(0, 10))])));
    expect(result.current.data?.subTasksCompleted).toBe(0);
  });
  it('rolls a mounted page into Monday without keeping the infinitely fresh prior week', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-25T23:59:59Z'));
    mocks.source.mockResolvedValue(source([saved('2026-10-25'), saved('2026-10-26')]));
    const { result } = renderHook(() => useWeeklyMetrics(), { wrapper: wrapper() });
    for (let step = 0; step < 3; step++) await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(result.current.data?.[0].date).toBe('2026-10-19');
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    for (let step = 0; step < 2; step++) await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(result.current.data?.[0].date).toBe('2026-10-26');
    expect(result.current.metrics?.totals.subTasksCompleted).toBe(1);
    expect(mocks.source).toHaveBeenCalledTimes(2);
  });
  it('labels retained earlier records as all dates, separate from exact current counts', () => {
    const metrics = projectActivity({ ...source(), legacy: [{ id: 'old', kind: 'task', role: null, recordedAt: '2020-01-01T00:00:00Z' }] }, [metricRange('week', 'sub', 'UTC', new Date())]);
    render(<ActivityMetricsNotice metrics={metrics} />);
    expect(screen.getByText('Earlier records — all retained dates in this relationship')).toBeTruthy();
    expect(screen.getByText(/1 task completions/)).toBeTruthy();
    expect(screen.getByText(/preserved separately/).textContent).toContain('cannot be assigned accurately');
  });
});
