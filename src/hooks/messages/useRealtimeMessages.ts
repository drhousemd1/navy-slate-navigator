
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMessageArchive } from './useMessageArchive';

export const useRealtimeMessages = (refetch: () => void, getPartnerId: () => Promise<string | undefined>) => {
  const { user } = useAuth();
  const { archiveOldMessages } = useMessageArchive();

  // Create a stable callback for refetching
  const handleNewMessage = useCallback(() => {
    console.log('New message received, triggering refetch');
    refetch();
  }, [refetch]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!user) return;

    let channelSubscription: any = null;
    
    // Set up subscription based on partner ID
    const setupSubscription = async () => {
      try {
        const partnerId = await getPartnerId();
        if (!partnerId) return;
        
        console.log('Setting up realtime messages subscription for user:', user.id, 'and partner:', partnerId);
        
        // Create unique channel name to prevent conflicts
        const channelName = `messages-channel-${user.id}-${Date.now()}`;
        
        // Clean up any existing channel before creating a new one
        if (channelSubscription) {
          supabase.removeChannel(channelSubscription);
        }
        
        // Subscribe to message inserts
        channelSubscription = supabase
          .channel(channelName)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `sender_id=eq.${user.id},receiver_id=eq.${partnerId}`,
          }, () => handleNewMessage())
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public', 
            table: 'messages',
            filter: `sender_id=eq.${partnerId},receiver_id=eq.${user.id}`,
          }, () => handleNewMessage())
          .subscribe((status) => {
            console.log('Realtime subscription status:', status);
            
            // If we're connected, archive old messages
            if (status === 'SUBSCRIBED') {
              archiveOldMessages(user.id, partnerId);
            }
          });
      } catch (error) {
        console.error('Error setting up realtime subscription:', error);
      }
    };
    
    setupSubscription();
    
    // Cleanup function
    return () => {
      console.log('Cleaning up realtime subscription');
      if (channelSubscription) {
        supabase.removeChannel(channelSubscription);
      }
    };
  }, [user, handleNewMessage, getPartnerId, archiveOldMessages]);

  return {};
};
