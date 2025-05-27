import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

export const useUserDomPointsQuery = (userId?: string) => {
  const queryKey = ['user-dom-points', userId];

  const fetchUserDomPoints = async () => {
    if (!userId) {
      logger.debug('No user ID provided, returning 0 DOM points.');
      return 0;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('dom_points')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        logger.warn('No profile data found for user:', userId);
        return 0;
      }

      const domPoints = data.dom_points || 0;
      logger.debug(`Fetched DOM points for user ${userId}:`, domPoints);
      return domPoints;
    } catch (error: unknown) {
      logger.error('Failed to fetch user DOM points:', getErrorMessage(error), error);
      toast({
        title: 'Error fetching DOM points',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
      return 0; // Return default or null
    }
  };

  return useQuery({
    queryKey,
    queryFn: fetchUserDomPoints,
    enabled: !!userId,
    staleTime: 60 * 1000, // 60 seconds
  });
};
