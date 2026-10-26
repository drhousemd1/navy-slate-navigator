import { useCallback, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useActionCommands } from '@/contexts/ActionCommandsContext';
import { useUserIds } from '@/contexts/UserIdsContext';
import { metricRange, projectActivity, type MetricPeriod, type MetricRange } from './projection';
import { METRICS_QUERY_KEY, metricsScopeKey, readMetricClocks, readMetricsSource } from './readModel';

// Share one cheap clock across chart/tile observers. React only re-renders when
// the saved-zone period signature changes, including after sleep/tab restoration.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
const tick = () => listeners.forEach(listener => listener());
function subscribeClock(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(tick, 1000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearInterval(timer); timer = undefined;
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    }
  };
}

export function useActivityMetrics(period: MetricPeriod, enabled = true) {
  const { scope, mode, error: actionError } = useActionCommands();
  const { subUserId, domUserId, timezone } = useUserIds();
  const ready = enabled && !!scope && (mode === 'atomic' || mode === 'legacy');
  const clocks = useQuery({ queryKey: [...METRICS_QUERY_KEY, 'clocks', ...metricsScopeKey(scope), subUserId, domUserId, timezone],
    enabled: ready, queryFn: ({ signal }) => readMetricClocks(scope!, { subUserId, domUserId }, signal),
    retry: false, networkMode: 'always', staleTime: 15_000, refetchInterval: 30_000, refetchOnMount: true, refetchOnWindowFocus: true, refetchOnReconnect: true });
  const getSignature = useCallback(() => clocks.data ? JSON.stringify(clocks.data.map(clock => metricRange(period, clock.role, clock.timeZone, new Date()))) : '[]', [clocks.data, period]);
  const signature = useSyncExternalStore(subscribeClock, getSignature, getSignature);
  const ranges: MetricRange[] = JSON.parse(signature);
  const query = useQuery({ queryKey: [...METRICS_QUERY_KEY, period, ...metricsScopeKey(scope), mode, signature],
    enabled: ready && !!clocks.data && !clocks.error,
    queryFn: async ({ signal }) => projectActivity(await readMetricsSource(scope!, mode as 'atomic' | 'legacy', signal), ranges),
    retry: false, networkMode: 'always', staleTime: 5_000, refetchInterval: 15_000, refetchOnMount: true, refetchOnWindowFocus: true, refetchOnReconnect: true });
  const error = clocks.error ?? query.error ?? (mode === 'error' ? new Error(actionError || 'Activity account could not be verified.') : null);
  return { ...query, data: ready && !error ? query.data : undefined, error,
    isLoading: enabled && !error && (mode === 'loading' || clocks.isPending || query.isPending),
    refetch: async () => { const result = await clocks.refetch(); if (!result.error) await query.refetch(); } };
}
