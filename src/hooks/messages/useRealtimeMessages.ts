import { useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMessageArchive } from './useMessageArchive';

export const useRealtimeMessages = (refetch: () => void, partnerId: string | undefined) => {
  const { user } = useAuth();
  const { archiveOldMessages } = useMessageArchive();
  const hasSubscribed = useRef(false);
  const subscriptionRef = useRef<any>(null);

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
    
    // First clean up any existing subscription
    if (subscriptionRef.current) {
      console.log('❌ Cleaning up previous subscription before creating new one');
      getSupabaseClient().removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    
    // Subscribe to message inserts with immediate refetch for both incoming and outgoing messages
    const channelSubscription = getSupabaseClient()
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
    
    // Store the subscription reference
    subscriptionRef.current = channelSubscription;
    
    // Cleanup function
    return () => {
      if (subscriptionRef.current) {
        console.log('❌ Cleaning up realtime subscription');
        getSupabaseClient().removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        hasSubscribed.current = false;
      }
    };
  }, [user?.id, partnerId, handleNewMessage, archiveOldMessages]);

  return {};
};
