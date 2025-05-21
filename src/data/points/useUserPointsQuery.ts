
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const USER_POINTS_QUERY_KEY_PREFIX = 'userPoints';

const fetchUserPoints = async (userId: string | null): Promise<number> => {
  if (!userId) return 0;
  const { data, error } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', userId)
    .single();

  if (error) {
    console.error(`Error fetching points for user ${userId}:`, error.message);
    return 0; // Return 0 on error or if profile not found
  }
  return data?.points ?? 0;
};

export const useUserPointsQuery = (userId: string | null) => {
  return useQuery<number, Error>({
    queryKey: [USER_POINTS_QUERY_KEY_PREFIX, userId],
    queryFn: () => fetchUserPoints(userId),
    enabled: !!userId, // Only run query if userId is available
    staleTime: Infinity, // Keep data fresh until invalidated
  });
};
