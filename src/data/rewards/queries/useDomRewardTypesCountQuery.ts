
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const DOM_REWARD_TYPES_COUNT_QUERY_KEY = 'domRewardTypesCount';

const fetchDomRewardTypesCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('rewards')
    .select('*', { count: 'exact', head: true })
    .eq('is_dom_reward', true);

  if (error) {
    console.error('Error fetching dom reward types count:', error.message);
    return 0;
  }
  return count ?? 0;
};

export const useDomRewardTypesCountQuery = () => {
  return useQuery<number, Error>({
    queryKey: [DOM_REWARD_TYPES_COUNT_QUERY_KEY],
    queryFn: fetchDomRewardTypesCount,
    staleTime: Infinity,
  });
};
