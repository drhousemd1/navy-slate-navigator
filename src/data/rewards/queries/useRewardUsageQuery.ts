
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface RewardUsageData {
  day_of_week: number;
  used: boolean;
  week_number: string;
}

const fetchRewardUsage = async (rewardId: string): Promise<boolean[]> => {
  // Get current week number
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Start of current week (Monday)
  const weekNumber = `${startOfWeek.getFullYear()}-W${Math.ceil(startOfWeek.getDate() / 7)}`;

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
