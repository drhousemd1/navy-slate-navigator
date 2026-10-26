import { useActivityMetrics } from '@/data/metrics/useActivityMetrics';
import type { MetricDay } from '@/data/metrics/projection';
export type WeeklyDataItem = MetricDay;
export const WEEKLY_METRICS_QUERY_KEY = ['activity-metrics', 'week'] as const;
export function useWeeklyMetrics(options?: { enabled?: boolean }) {
  const result = useActivityMetrics('week', options?.enabled ?? true);
  return { ...result, metrics: result.data, data: result.data?.dataArray };
}
