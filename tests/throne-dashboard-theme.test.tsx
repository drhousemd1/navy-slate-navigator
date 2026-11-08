import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyCounts } from '@/data/metrics/projection';
import { COLOR_SCHEMES } from '@/lib/colorSchemes';
const state = vi.hoisted(() => ({ scheme: 'light-turquoise', loading: false, error: null as Error | null, empty: false }));
vi.mock('@/contexts/ColorSchemeContext', () => ({ useColorScheme: () => ({ currentScheme: state.scheme }) }));
vi.mock('@/contexts/UserIdsContext', () => ({ useUserIds: () => ({ subUserId: 'sub', domUserId: 'dom', isLoadingUserIds: state.loading }) }));
vi.mock('@/data/wellbeing/scope', () => ({ useWellbeingScope: () => 'scope', wellbeingScopeKey: () => ['scope'] }));
vi.mock('@/data/queries/metrics/useWeeklyMetrics', () => ({ useWeeklyMetrics: () => ({ data: state.empty ? [] : days, metrics, isLoading: state.loading, error: state.error, refetch: vi.fn() }) }));
vi.mock('@/data/queries/metrics/useMonthlyMetrics', () => ({ useMonthlyMetrics: () => ({ data: { dataArray: state.empty ? [] : days, monthlyTotals: totals }, metrics, isLoading: state.loading, error: state.error, refetch: vi.fn() }) }));
vi.mock('@/data/queries/useWeeklyMetricsSummary', () => ({ useWeeklyMetricsSummary: () => ({ data: totals, isLoading: state.loading, error: state.error, refetch: vi.fn() }) }));
vi.mock('@/data/wellbeing/queries/useWeeklyWellbeingQuery', () => ({ useWeeklyWellbeingQuery: () => ({ data: state.empty ? [] : wellness, isLoading: state.loading, error: state.error, refetch: vi.fn() }) }));
vi.mock('@/data/wellbeing/queries/useMonthlyWellbeingQuery', () => ({ useMonthlyWellbeingQuery: () => ({ data: state.empty ? [] : wellness, isLoading: state.loading, error: state.error, refetch: vi.fn() }) }));
vi.mock('@/data/wellbeing/queries/useWellbeingSnapshotForDate', () => ({ useWellbeingSnapshotForDate: () => ({ data: undefined, isLoading: false, error: null }) }));
vi.mock('recharts', async importOriginal => {
  const actual = await importOriginal<typeof import('recharts')>();
  // Keep the real chart/SVG renderers. Supply only the browser layout measurement
  // unavailable in jsdom, including ChartContainer's nested responsive wrapper.
  return { ...actual, ResponsiveContainer: ({ children, width, height }: React.PropsWithChildren<{ width?: number | string; height?: number | string }>) =>
    <div>{React.Children.map(children, child => React.isValidElement(child) && typeof child.type !== 'string'
      ? React.cloneElement(child as React.ReactElement<{ width: number; height: number }>, { width: typeof width === 'number' ? width : 640, height: typeof height === 'number' ? height : 260 }) : child)}</div> };
});
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: React.PropsWithChildren) => <main>{children}</main> }));
vi.mock('@/components/throne/PersonalThroneCards', () => ({ default: () => null }));
vi.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '/throne-room' }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
import WeeklyMetricsChart from '@/components/throne/WeeklyMetricsChart';
import MonthlyMetricsChart from '@/components/throne/MonthlyMetricsChart';
import WellbeingLineChart from '@/components/throne/WellbeingLineChart';
import UnifiedMetricsTiles from '@/components/throne/UnifiedMetricsTiles';
import AdminSettingsCard from '@/components/throne/AdminSettingsCard';
import CompactWellbeingMetrics from '@/components/wellbeing/CompactWellbeingMetrics';
import { ActivityMetricsNotice } from '@/components/throne/ActivityMetricsNotice';
import ThroneRoom from '@/pages/ThroneRoom';
const totals = { ...emptyCounts(), subTasksCompleted: 3, domTasksCompleted: 2, rulesBroken: 1, subRewardsRedeemed: 4, domRewardsRedeemed: 5, punishmentsPerformed: 6 };
const days = [{ date: '2026-11-02', ...totals }];
const metrics = { dataArray: days, totals, mode: 'atomic' as const, ranges: [{ role: 'sub' as const, timeZone: 'UTC', start: '2026-11-02', end: '2026-11-09' }], retainedLegacy: { task: 1, rule: 0, reward: 0, punishment: 0 }, unclassifiedLegacy: 0 };
const wellness = [{ date: '2026-11-02', subScore: 60, domScore: 80, subHasData: true, domHasData: true }];
const paletteBefore = JSON.stringify(COLOR_SCHEMES);
beforeEach(() => { state.scheme = 'light-turquoise'; state.loading = false; state.error = null; state.empty = false; });
afterEach(() => cleanup());
const classes = (element: Element, token: string) => expect(element.classList.contains(token)).toBe(true);

describe('Throne dashboard original presentation', () => {
  it.each(COLOR_SCHEMES.map(scheme => scheme.name))('renders real axes/headers while retaining series colors in %s', scheme => {
    state.scheme = scheme; const light = scheme === 'light-turquoise';
    const { container } = render(<><WeeklyMetricsChart /><MonthlyMetricsChart /><WellbeingLineChart /></>);
    for (const name of ['Weekly Activity', 'Monthly Activity', 'Weekly Wellness']) classes(screen.getByRole('heading', { name }), 'text-white');
    const ticks = [...container.querySelectorAll('.recharts-cartesian-axis-tick-value')];
    expect(ticks.length).toBeGreaterThan(5);
    for (const tick of ticks) {
      expect(tick.getAttribute('fill')).toBe('#D1D5DB');
      // Inline fill outranks the monthly ChartContainer's muted tick selector.
      expect((tick as SVGElement).style.fill).toBe('');
    }
    const axes = [...container.querySelectorAll('.recharts-cartesian-axis-line')];
    for (const axis of axes) expect(axis.getAttribute('stroke')).toBe('#8E9196');
    for (const color of ['#0EA5E9', '#DC2626', '#F97316', '#9b87f5', '#EC4899', '#ea384c']) expect(container.innerHTML).toContain(`fill="${color}"`);
    for (const color of ['#3B82F6', '#EF4444']) expect(container.innerHTML).toContain(`fill="${color}"`);
    expect(JSON.stringify(COLOR_SCHEMES)).toBe(paletteBefore);
  });
  it.each(COLOR_SCHEMES.map(scheme => scheme.name))('keeps totals, retained history and expanded settings readable in %s', scheme => {
    state.scheme = scheme; const light = scheme === 'light-turquoise';
    render(<><UnifiedMetricsTiles isMonthlyView={false} /><ActivityMetricsNotice metrics={metrics} /><AdminSettingsCard /></>);
    for (const value of ['3', '2']) classes(screen.getByText(value), 'text-white');
    classes(screen.getByText('Earlier records — all retained dates in this relationship'), 'text-gray-200');
    classes(screen.getByText('Admin Settings'), 'text-white');
    fireEvent.click(screen.getByRole('button', { name: 'Expand admin settings' }));
    for (const name of ['Access Control', 'Global Rules', 'Notifications']) classes(screen.getByRole('heading', { name }), 'text-white');
    classes(screen.getByText('Manage user roles and permissions'), 'text-nav-inactive');
    classes(screen.getByText('Sub Tasks Completed:'), 'text-sky-400');
  });
  it('keeps original chart/tile containers in error and loading states without turning failures into zero totals', () => {
    state.error = new Error('Denied'); const view = render(<><UnifiedMetricsTiles isMonthlyView={false} /><WellbeingLineChart /></>);
    expect(screen.getAllByRole('alert')).toHaveLength(2); expect(screen.queryByText('0')).toBeNull();
    expect(screen.getByText('Sub Tasks Completed:')).toBeTruthy(); expect(screen.getAllByText('—')).toHaveLength(6); classes(screen.getByRole('button', { name: 'Retry activity' }), 'text-white');
    state.error = null; state.empty = true; view.rerender(<><WeeklyMetricsChart /><MonthlyMetricsChart /><WellbeingLineChart /></>);
    for (const message of screen.getAllByText(/No (activity|wellness) data to display/)) classes(message, 'text-white');
    state.loading = true; view.rerender(<ThroneRoom />); classes(screen.getByText('Loading your command center...'), 'text-white');
  });
  it.each(COLOR_SCHEMES.map(scheme => scheme.name))('preserves recorded/unknown wellness values and bar colors in %s', scheme => {
    state.scheme = scheme; const light = scheme === 'light-turquoise';
    const view = render(<CompactWellbeingMetrics metrics={{ energy: 0 }} selectedDate="2026-11-02" selectedUserType="sub" />);
    classes(screen.getByText('Submissive - 2026-11-02'), 'text-gray-300');
    classes(screen.getByText('0%'), 'text-gray-400');
    for (const value of screen.getAllByText('Not recorded')) classes(value, 'text-gray-400');
    const selectedBars = [...view.container.querySelectorAll('[style]')].map(element => element.getAttribute('style'));
    state.scheme = 'default'; view.rerender(<CompactWellbeingMetrics metrics={{ energy: 0 }} selectedDate="2026-11-02" selectedUserType="sub" />);
    expect([...view.container.querySelectorAll('[style]')].map(element => element.getAttribute('style'))).toEqual(selectedBars);
    state.scheme = scheme; view.rerender(<CompactWellbeingMetrics metrics={null} selectedDate={null} />);
    for (const value of screen.getAllByText('Not recorded')) classes(value, 'text-nav-inactive');
  });
});
