
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

    // Subscribe to new messages
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${user.id},receiver_id=eq.${user.id}`
      }, (payload) => {
        // Add the new message to the messages list if it's relevant
        
        // Check if this message is relevant to our conversation
        getPartnerId().then(partnerIdValue => {
          if (partnerIdValue && 
            ((payload.new.sender_id === user.id && payload.new.receiver_id === partnerIdValue) ||
            (payload.new.sender_id === partnerIdValue && payload.new.receiver_id === user.id))
          ) {
            // Trigger a refetch to get the latest messages
            refetch();
            
            // Check if we need to archive old messages
            archiveOldMessages(user.id, partnerIdValue);
          }
        });
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch, getPartnerId, archiveOldMessages]);

  return {};
};
