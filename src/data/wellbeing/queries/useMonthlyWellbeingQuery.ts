import { useWellbeingSeries, type WellbeingDataItem } from './useWellbeingSeries';
export type MonthlyWellbeingDataItem = WellbeingDataItem;
export const MONTHLY_WELLBEING_QUERY_KEY = ['wellbeing-series-v2'];
export const useMonthlyWellbeingQuery = (options?: { enabled?: boolean }) => useWellbeingSeries(true, options?.enabled ?? true);
