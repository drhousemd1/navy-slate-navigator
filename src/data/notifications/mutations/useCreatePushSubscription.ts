import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

interface CreatePushSubscriptionParams {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
}

export const useCreatePushSubscription = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ endpoint, p256dhKey, authKey }: CreatePushSubscriptionParams) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('user_push_subscriptions')
        .insert({
          user_id: user.id,
          endpoint,
          p256dh_key: p256dhKey,
          auth_key: authKey,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      logger.debug('[useCreatePushSubscription] Push subscription created:', data);
    },
    onError: (error) => {
      logger.error('[useCreatePushSubscription] Error creating push subscription:', error);
    }
  });
};