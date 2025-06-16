
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RULES_QUERY_KEY } from '../queries';
import { useUserIds } from '@/contexts/UserIdsContext';
import { logger } from '@/lib/logger';
import { toast } from '@/hooks/use-toast';

interface CreateRuleViolationParams {
  ruleId: string;
  userId: string;
}

export const useCreateRuleViolation = () => {
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();

  return useMutation({
    mutationFn: async ({ ruleId, userId }: CreateRuleViolationParams) => {
      const { error } = await supabase
        .from('rule_violations')
        .insert({
          rule_id: ruleId,
          user_id: userId,
          violated_at: new Date().toISOString()
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
      
      toast({
        title: "Rule Violation Recorded",
        description: "The rule violation has been recorded successfully.",
      });
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
