
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMessageArchive } from './useMessageArchive';

export const useRealtimeMessages = (refetch: () => void, partnerId: string | undefined) => {
  const { user } = useAuth();
  const { archiveOldMessages } = useMessageArchive();
  const hasSubscribed = useRef(false);

  // Create a stable callback for refetching
  const handleNewMessage = useCallback(() => {
    console.log('🔁 New message received via realtime, triggering refetch');
    refetch();
  }, [refetch]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    // Wait until both user and partnerId are fully available and only subscribe once
    if (!user?.id || !partnerId || hasSubscribed.current) return;
    
    console.log('📡 Setting up realtime messages subscription for user:', user.id, 'and partner:', partnerId);
    hasSubscribed.current = true;
    
    // Create unique channel name to prevent conflicts
    const channelName = `messages-${user.id}-${partnerId}`;
    
    // Subscribe to message inserts with immediate refetch for both incoming and outgoing messages
    const channelSubscription = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${user.id},receiver_id=eq.${partnerId}`,
      }, (payload) => {
        console.log('Realtime: caught outgoing message INSERT:', payload);
        handleNewMessage();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public', 
        table: 'messages',
        filter: `sender_id=eq.${partnerId},receiver_id=eq.${user.id}`,
      }, (payload) => {
        console.log('Realtime: caught incoming message INSERT:', payload);
        handleNewMessage();
      })
      .subscribe((status) => {
        console.log('✅ Realtime subscription status:', status);
        
        // If we're connected, archive old messages
        if (status === 'SUBSCRIBED') {
          archiveOldMessages(user.id, partnerId);
        }
      });
    
    // Cleanup function
    return () => {
      console.log('❌ Cleaning up realtime subscription');
      hasSubscribed.current = false;
      supabase.removeChannel(channelSubscription);
    };
  }, [user?.id, partnerId, handleNewMessage, archiveOldMessages]);

  return {};
};
