import { useWellbeingSeries, type WellbeingDataItem } from './useWellbeingSeries';
export type WeeklyWellbeingDataItem = WellbeingDataItem;
export const WEEKLY_WELLBEING_QUERY_KEY = ['wellbeing-series-v2'];
export const useWeeklyWellbeingQuery = (options?: { enabled?: boolean }) => useWellbeingSeries(false, options?.enabled ?? true);
