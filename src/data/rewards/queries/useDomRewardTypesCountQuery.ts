
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { PostgrestError } from '@supabase/supabase-js';

export const DOM_REWARD_TYPES_COUNT_QUERY_KEY = 'domRewardTypesCount';

const fetchDomRewardTypesCount = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('rewards')
    .select('supply')
    .eq('is_dom_reward', true);

  if (error) {
    logger.error('Error fetching dom reward types count:', error.message);
    return 0;
  }
  
  // Calculate total supply of all dom rewards
  const totalSupply = data?.reduce((total, reward) => {
    return total + (reward.supply === -1 ? 0 : reward.supply); // Handle infinite supply
  }, 0) || 0;
  
  return totalSupply;
};

export const useDomRewardTypesCountQuery = () => {
  return useQuery<number, PostgrestError | Error>({
    queryKey: [DOM_REWARD_TYPES_COUNT_QUERY_KEY],
    queryFn: fetchDomRewardTypesCount,
    staleTime: 0, // Always refetch when invalidated
    refetchOnWindowFocus: true,
  });
};
