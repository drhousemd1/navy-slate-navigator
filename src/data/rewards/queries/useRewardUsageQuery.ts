
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { getISOWeekString } from '@/lib/dateUtils';

interface RewardUsageData {
  day_of_week: number;
  used: boolean;
  week_number: string;
}

const fetchRewardUsage = async (rewardId: string): Promise<boolean[]> => {
  // Get current week number using ISO week calculation
  const now = new Date();
  const weekNumber = getISOWeekString(now);

  const { data, error } = await supabase
    .from('reward_usage')
    .select('day_of_week, used')
    .eq('reward_id', rewardId)
    .eq('week_number', weekNumber)
    .order('day_of_week');

  if (error) {
    logger.error('Error fetching reward usage:', error);
    throw error;
  }

  // Convert to boolean array for 7 days (Monday=0 to Sunday=6)
  const usageArray = Array(7).fill(false);
  
  if (data) {
    data.forEach((usage: RewardUsageData) => {
      if (usage.day_of_week >= 0 && usage.day_of_week < 7) {
        usageArray[usage.day_of_week] = Boolean(usage.used);
      }
    });
  }

  return usageArray;
};

export const useRewardUsageQuery = (rewardId: string) => {
  return useQuery<boolean[]>({
    queryKey: ['reward-usage', rewardId],
    queryFn: () => fetchRewardUsage(rewardId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: !!rewardId,
  });
};
