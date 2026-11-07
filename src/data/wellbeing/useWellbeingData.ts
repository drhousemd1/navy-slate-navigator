import { useAuth } from '@/contexts/auth';
import { useWellbeingQuery } from './queries';
import { getWellbeingColor, getWellbeingColorClass, getWellbeingStatus, transformMetricsForDisplay } from '@/lib/wellbeingUtils';
export function useWellbeingData() {
  const { user } = useAuth(); const query = useWellbeingQuery(user?.id ?? null);
  const score = query.data?.overallScore ?? null;
  return { wellbeingSnapshot: query.data, isLoading: query.isLoading, error: query.error,
    getCurrentScore: () => score,
    getWellbeingInfo: () => ({ score, color: score === null ? 'transparent' : getWellbeingColor(score),
      colorClass: score === null ? '' : getWellbeingColorClass(score), status: score === null ? 'No saved check-in' : getWellbeingStatus(score),
      metrics: transformMetricsForDisplay(query.data?.metrics ?? {}) }), refetch: query.refetch };
}
