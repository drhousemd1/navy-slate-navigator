import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export const SUB_REWARD_TYPES_COUNT_QUERY_KEY = 'subRewardTypesCount';

const fetchSubRewardTypesCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('rewards')
    .select('*', { count: 'exact', head: true })
    .eq('is_dom_reward', false);

  if (error) {
    logger.error('Error fetching sub reward types count:', error.message);
    return 0;
  }
  return count ?? 0;
};

export const useSubRewardTypesCountQuery = () => {
  return useQuery<number, Error>({
    queryKey: [SUB_REWARD_TYPES_COUNT_QUERY_KEY],
    queryFn: fetchSubRewardTypesCount,
    staleTime: Infinity,
  });
};
