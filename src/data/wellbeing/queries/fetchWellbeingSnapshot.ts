import { fetchWellbeingPeople } from '../api';
import type { WellbeingScope } from '../types';
export async function fetchWellbeingSnapshot(scope: WellbeingScope, userId: string, signal?: AbortSignal) {
  return (await fetchWellbeingPeople(scope, signal)).find(person => person.userId === userId)?.latest ?? null;
}
