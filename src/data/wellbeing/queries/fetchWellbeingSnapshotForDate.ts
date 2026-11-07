import { listWellbeing } from '../api';
import { addDays } from '../calendar';
import type { WellbeingScope } from '../types';
export async function fetchWellbeingSnapshotForDate(scope: WellbeingScope, userId: string, date: string, signal?: AbortSignal) {
  return (await listWellbeing(scope, userId, { start: date, end: addDays(date, 1) }, signal))[0] ?? null;
}
