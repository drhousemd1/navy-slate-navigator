import { useQuery } from '@tanstack/react-query';
import { fetchWellbeingSnapshotForDate } from './fetchWellbeingSnapshotForDate';
import { useWellbeingScope, wellbeingScopeKey } from '../scope';
export const WELLBEING_SNAPSHOT_FOR_DATE_QUERY_KEY = ['wellbeing-date-v2'];
export function useWellbeingSnapshotForDate(userId: string | null, date: string | null) {
  const scope = useWellbeingScope();
  return useQuery({ queryKey: [...WELLBEING_SNAPSHOT_FOR_DATE_QUERY_KEY, ...wellbeingScopeKey(scope), userId, date],
    enabled: !!scope && !!userId && !!date, retry: false,
    queryFn: ({ signal }) => fetchWellbeingSnapshotForDate(scope!, userId!, date!, signal) });
}
