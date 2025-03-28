
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMessageArchive } from './useMessageArchive';

export const useRealtimeMessages = (refetch: () => void, getPartnerId: () => Promise<string | undefined>) => {
  const { user } = useAuth();
  const { archiveOldMessages } = useMessageArchive();

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!user) return;

    // Get partner ID immediately to set up proper filtering
    getPartnerId().then(partnerId => {
      if (!partnerId) return;
      
      console.log('Setting up realtime messages subscription for user:', user.id, 'and partner:', partnerId);
      
      // Create channel name with unique identifier to prevent conflicts
      const channelName = `messages-channel-${user.id}-${Date.now()}`;
      
      // Subscribe to new messages with a broader filter that captures all relevant messages
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        }, (payload) => {
          console.log('Received new message:', payload);
          
          // Check if this message is relevant to our conversation
          if (payload.new && 
            ((payload.new.sender_id === user.id && payload.new.receiver_id === partnerId) ||
            (payload.new.sender_id === partnerId && payload.new.receiver_id === user.id))
          ) {
            console.log('Message is relevant to this conversation, triggering refetch');
            // Trigger a refetch to get the latest messages
            refetch();
            
            // Check if we need to archive old messages
            archiveOldMessages(user.id, partnerId);
          }
        })
        .subscribe((status) => {
          console.log('Realtime subscription status:', status);
        });
      
      return () => {
        console.log('Cleaning up realtime subscription');
        supabase.removeChannel(channel);
      };
    });
  }, [user, refetch, getPartnerId, archiveOldMessages]);

  return {};
};
