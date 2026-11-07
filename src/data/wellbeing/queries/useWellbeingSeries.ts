import { useQuery } from '@tanstack/react-query';
import { useUserIds } from '@/contexts/UserIdsContext';
import { fetchWellbeingPeople, listWellbeing } from '../api';
import { dateRange, localDateAt } from '../calendar';
import { useWellbeingScope, wellbeingScopeKey } from '../scope';
import type { WellbeingScope } from '../types';
export interface WellbeingDataItem { date: string; subScore: number | null; domScore: number | null; subHasData: boolean; domHasData: boolean }
export async function fetchWellbeingSeries(scope: WellbeingScope, range: ReturnType<typeof dateRange>, signal?: AbortSignal): Promise<WellbeingDataItem[]> {
  const people = await fetchWellbeingPeople(scope, signal);
  const series: WellbeingDataItem[] = range.dates.map(date => ({ date, subScore: null, domScore: null, subHasData: false, domHasData: false }));
  await Promise.all(people.map(async person => {
    const rows = await listWellbeing(scope, person.userId, range, signal);
    for (const day of series) {
      const row = rows.find(item => item.localDate === day.date); // RPC order is newest first, stable by ID.
      if (row) { day[person.role === 'sub' ? 'subScore' : 'domScore'] = row.overallScore; day[person.role === 'sub' ? 'subHasData' : 'domHasData'] = true; }
    }
  }));
  return series;
}
export function useWellbeingSeries(monthly: boolean, enabled = true) {
  const scope = useWellbeingScope(); const { timezone } = useUserIds();
  const date = timezone ? localDateAt(timezone) : null;
  const range = date ? dateRange(date, monthly) : null;
  return useQuery({ queryKey: ['wellbeing-series-v2', ...wellbeingScopeKey(scope), monthly, range?.start, range?.end],
    enabled: !!scope && !!range && enabled, retry: false,
    queryFn: ({ signal }) => fetchWellbeingSeries(scope!, range!, signal) });
}
