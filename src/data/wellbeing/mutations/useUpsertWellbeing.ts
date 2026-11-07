import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveWellbeingCheckin } from '../api';
import type { WellbeingRequest } from '../types';
// Kept as the existing import seam; storage is append-only, never an upsert.
export function useUpsertWellbeing() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (request: WellbeingRequest) => saveWellbeingCheckin(request), retry: false,
    onSuccess: () => client.invalidateQueries({ predicate: query => String(query.queryKey[0]).startsWith('wellbeing-') }) });
}
