import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

export const useDeletePushSubscription = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (endpoint: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('user_push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', endpoint);

      if (error) {
        throw error;
      }

      return { endpoint };
    },
    onSuccess: (data) => {
      logger.debug('[useDeletePushSubscription] Push subscription deleted:', data);
    },
    onError: (error) => {
      logger.error('[useDeletePushSubscription] Error deleting push subscription:', error);
    }
  });
};