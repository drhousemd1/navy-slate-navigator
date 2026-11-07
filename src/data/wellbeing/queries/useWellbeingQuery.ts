import { useQuery } from '@tanstack/react-query';
import { fetchWellbeingPeople } from '../api';
import { useWellbeingScope, wellbeingScopeKey } from '../scope';

export const WELLBEING_QUERY_KEY = ['wellbeing-v2'];
export function useWellbeingPeople() {
  const scope = useWellbeingScope();
  return useQuery({ queryKey: [...WELLBEING_QUERY_KEY, ...wellbeingScopeKey(scope)], enabled: !!scope,
    queryFn: ({ signal }) => fetchWellbeingPeople(scope!, signal), retry: false, staleTime: 30_000 });
}
export function useWellbeingQuery(userId: string | null) {
  const query = useWellbeingPeople();
  return { ...query, data: userId ? query.data?.find(person => person.userId === userId)?.latest ?? null : null };
}
