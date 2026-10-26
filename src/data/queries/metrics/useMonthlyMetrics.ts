import { useActivityMetrics } from '@/data/metrics/useActivityMetrics';
import type { MetricCounts, MetricDay } from '@/data/metrics/projection';
export type MonthlyDataItem = MetricDay;
export type MonthlyMetricsSummary = MetricCounts;
export interface MonthlyMetricsData { dataArray: MonthlyDataItem[]; monthlyTotals: MonthlyMetricsSummary }
export const MONTHLY_METRICS_QUERY_KEY = ['activity-metrics', 'month'] as const;
export function useMonthlyMetrics(options?: { enabled?: boolean }) {
  const result = useActivityMetrics('month', options?.enabled ?? true);
  return { ...result, metrics: result.data, data: result.data ? { dataArray: result.data.dataArray, monthlyTotals: result.data.totals } : undefined };
}
