import { useQuery } from '@tanstack/react-query';
import { fetchWellbeingSnapshotForDate } from './fetchWellbeingSnapshotForDate';
import { WellbeingSnapshot } from '../types';
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';

export const WELLBEING_SNAPSHOT_FOR_DATE_QUERY_KEY = ['wellbeing-snapshot-for-date'];

export const useWellbeingSnapshotForDate = (userId: string | null, date: string | null) => {
  return useQuery<WellbeingSnapshot | null, Error>({
    queryKey: [...WELLBEING_SNAPSHOT_FOR_DATE_QUERY_KEY, userId, date],
    queryFn: () => {
      if (!userId || !date) {
        return Promise.resolve(null);
      }
      return fetchWellbeingSnapshotForDate(userId, date);
    },
    enabled: !!userId && !!date,
    ...STANDARD_QUERY_CONFIG,
  });
};