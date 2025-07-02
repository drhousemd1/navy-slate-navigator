
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { PostgrestError } from '@supabase/supabase-js';

export const DOM_REWARD_TYPES_COUNT_QUERY_KEY = 'domRewardTypesCount';

const fetchDomRewardTypesCount = async (userId: string | null): Promise<number> => {
  if (!userId) {
    logger.debug('fetchDomRewardTypesCount: No userId provided, returning 0.');
    return 0;
  }

  const { data, error } = await supabase
    .from('rewards')
    .select('supply')
    .eq('is_dom_reward', true)
    .eq('user_id', userId);

  if (error) {
    logger.error('Error fetching dom reward types count:', error.message);
    return 0;
  }
  
  // Only count positive supply values
  const totalSupply = data?.reduce((total, reward) => {
    return total + (reward.supply > 0 ? reward.supply : 0);
  }, 0) || 0;
  
  return totalSupply;
};

export const useDomRewardTypesCountQuery = (userId: string | null) => {
  return useQuery<number, PostgrestError | Error>({
    queryKey: [DOM_REWARD_TYPES_COUNT_QUERY_KEY, userId],
    queryFn: () => fetchDomRewardTypesCount(userId),
    enabled: !!userId,
    staleTime: 0, // Always refetch when invalidated
    refetchOnWindowFocus: true,
  });
};
