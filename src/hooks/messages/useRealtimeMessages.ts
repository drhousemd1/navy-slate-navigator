// Update import path for the auth hook
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth/AuthContext';

export const useRealtimeMessages = (refetch: () => Promise<void>, partnerId?: string) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !partnerId) {
      console.log('[useRealtimeMessages] User or partnerId not available, skipping realtime setup.');
      return;
    }

    console.log(`[useRealtimeMessages] Setting up realtime subscription for partnerId: ${partnerId}`);

    const channel = supabase
      .channel(`messages:${user.id}:${partnerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${partnerId},receiver_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[useRealtimeMessages] Received new message (sender -> you):', payload);
          toast({
            title: 'New Message',
            description: 'You have a new message from your partner!',
          });
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id},receiver_id=eq.${partnerId}`
        },
        (payload) => {
          console.log('[useRealtimeMessages] Received new message (you -> sender):', payload);
          refetch();
        }
      )
      .subscribe((status) => {
        console.log(`[useRealtimeMessages] Subscription status: ${status}`);
      });

    return () => {
      console.log('[useRealtimeMessages] Unsubscribing from realtime messages');
      supabase.removeChannel(channel);
    };
  }, [user, partnerId, refetch]);
};
