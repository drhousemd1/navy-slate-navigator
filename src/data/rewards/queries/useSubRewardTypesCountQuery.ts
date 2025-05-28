
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { PostgrestError } from '@supabase/supabase-js';

export const SUB_REWARD_TYPES_COUNT_QUERY_KEY = 'subRewardTypesCount';

const fetchSubRewardTypesCount = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('rewards')
    .select('supply')
    .eq('is_dom_reward', false);

  if (error) {
    logger.error('Error fetching sub reward types count:', error.message);
    return 0;
  }
  
  // Calculate total supply of all sub rewards
  const totalSupply = data?.reduce((total, reward) => {
    return total + (reward.supply === -1 ? 0 : reward.supply); // Handle infinite supply
  }, 0) || 0;
  
  return totalSupply;
};

export const useSubRewardTypesCountQuery = () => {
  return useQuery<number, PostgrestError | Error>({
    queryKey: [SUB_REWARD_TYPES_COUNT_QUERY_KEY],
    queryFn: fetchSubRewardTypesCount,
    staleTime: 0, // Always refetch when invalidated
    refetchOnWindowFocus: true,
  });
};
