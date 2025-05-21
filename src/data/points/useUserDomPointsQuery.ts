
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const USER_DOM_POINTS_QUERY_KEY_PREFIX = 'userDomPoints';

const fetchUserDomPoints = async (userId: string | null): Promise<number> => {
  if (!userId) return 0;
  const { data, error } = await supabase
    .from('profiles')
    .select('dom_points')
    .eq('id', userId)
    .single();

  if (error) {
    console.error(`Error fetching dom_points for user ${userId}:`, error.message);
    return 0; // Return 0 on error or if profile not found
  }
  return data?.dom_points ?? 0;
};

export const useUserDomPointsQuery = (userId: string | null) => {
  return useQuery<number, Error>({
    queryKey: [USER_DOM_POINTS_QUERY_KEY_PREFIX, userId],
    queryFn: () => fetchUserDomPoints(userId),
    enabled: !!userId, // Only run query if userId is available
    staleTime: Infinity, // Keep data fresh until invalidated
  });
};
