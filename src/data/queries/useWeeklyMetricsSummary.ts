import { useActivityMetrics } from '@/data/metrics/useActivityMetrics';
/** Same query and projection as the weekly bars; no second date window or history fetch. */
export function useWeeklyMetricsSummary(options?: { enabled?: boolean }) {
  const result = useActivityMetrics('week', options?.enabled ?? true);
  return { ...result, metrics: result.data, data: result.data?.totals };
}
