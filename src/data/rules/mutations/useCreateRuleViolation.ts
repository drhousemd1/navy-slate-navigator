
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RULES_QUERY_KEY } from '../queries';
import { useUserIds } from '@/contexts/UserIdsContext';
import { logger } from '@/lib/logger';
import { toast } from '@/hooks/use-toast';
import { getMondayBasedDay } from '@/lib/utils';

interface CreateRuleViolationParams {
  ruleId: string;
  userId: string;
}

export const useCreateRuleViolation = () => {
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();

  return useMutation({
    mutationFn: async ({ ruleId, userId }: CreateRuleViolationParams) => {
      const now = new Date();
      const currentDay = getMondayBasedDay();
      
      // Calculate week number in YYYY-Www format
      const year = now.getFullYear();
      const startOfYear = new Date(year, 0, 1);
      const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
      const weekString = `${year}-W${weekNumber.toString().padStart(2, '0')}`;

      const { error } = await supabase
        .from('rule_violations')
        .insert({
          rule_id: ruleId,
          user_id: userId,
          violation_date: now.toISOString(),
          day_of_week: currentDay,
          week_number: weekString
        });

      if (error) {
        logger.error('Error creating rule violation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate rules query to refetch and update violation counts
      queryClient.invalidateQueries({ 
        queryKey: [...RULES_QUERY_KEY, subUserId, domUserId] 
      });
      
      // Remove duplicate success toast - optimistic mutations handle this automatically
      // toast({
      //   title: "Rule Violation Recorded",
      //   description: "The rule violation has been recorded successfully.",
      // });
    },
    onError: (error: Error) => {
      logger.error('Failed to record rule violation:', error);
      toast({
        title: "Error",
        description: "Failed to record the rule violation. Please try again.",
        variant: "destructive",
      });
    },
  });
};
