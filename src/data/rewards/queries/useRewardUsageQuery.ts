
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentWeekKey } from '@/lib/taskUtils';
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';

export const REWARD_USAGE_QUERY_KEY = 'reward-usage';

export const useRewardUsageQuery = (rewardId: string) => {
  return useQuery({
    queryKey: [REWARD_USAGE_QUERY_KEY, rewardId, getCurrentWeekKey()],
    queryFn: async () => {
      const weekKey = getCurrentWeekKey();
      
      const { data, error } = await supabase
        .from('reward_usage')
        .select('day_of_week, used')
        .eq('reward_id', rewardId)
        .eq('week_number', weekKey);

      if (error) {
        throw error;
      }

      // Convert to boolean array [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
      const usageArray = new Array(7).fill(false);
      
      if (data) {
        data.forEach(usage => {
          if (usage.day_of_week >= 0 && usage.day_of_week < 7) {
            usageArray[usage.day_of_week] = Boolean(usage.used);
          }
        });
      }

      return usageArray;
    },
    ...STANDARD_QUERY_CONFIG,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
