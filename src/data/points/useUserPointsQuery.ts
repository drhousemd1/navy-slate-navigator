import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

export const useUserPointsQuery = (userId?: string) => {
  const queryKey = ['userPoints', userId];

  const fetchUserPoints = async () => {
    if (!userId) {
      logger.warn('No userId provided to useUserPointsQuery, returning 0.');
      return 0;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        logger.warn(`No profile data found for user ID: ${userId}`);
        return 0;
      }

      return data.points || 0;
    } catch (error: unknown) {
      logger.error('Failed to fetch user points:', getErrorMessage(error), error);
      toast({
        title: 'Error fetching points',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
      return 0; // Return default or null
    }
  };

  return useQuery({
    queryKey,
    queryFn: fetchUserPoints,
    enabled: !!userId, // Only run the query if userId is not null
    staleTime: 60 * 1000, // 60 seconds
  });
};
