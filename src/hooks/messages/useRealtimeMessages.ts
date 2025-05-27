
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMessageArchive } from './useMessageArchive';
import { logger } from '@/lib/logger'; // Added logger import

export const useRealtimeMessages = (refetch: () => void, partnerId: string | undefined) => {
  const { user } = useAuth();
  const { archiveOldMessages } = useMessageArchive();
  const hasSubscribed = useRef(false);
  const subscriptionRef = useRef<any>(null);

  // Create a stable callback for refetching
  const handleNewMessage = useCallback(() => {
    logger.debug('🔁 New message received via realtime, triggering refetch'); // Replaced console.log
    refetch();
  }, [refetch]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    // Wait until both user and partnerId are fully available and only subscribe once
    if (!user?.id || !partnerId || hasSubscribed.current) return;
    
    logger.debug('📡 Setting up realtime messages subscription for user:', user.id, 'and partner:', partnerId); // Replaced console.log
    hasSubscribed.current = true;
    
    // Create unique channel name to prevent conflicts
    const channelName = `messages-${user.id}-${partnerId}`;
    
    // First clean up any existing subscription
    if (subscriptionRef.current) {
      logger.debug('❌ Cleaning up previous subscription before creating new one'); // Replaced console.log
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    
    // Subscribe to message inserts with immediate refetch for both incoming and outgoing messages
    const channelSubscription = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${user.id},receiver_id=eq.${partnerId}`,
      }, (payload) => {
        logger.debug('Realtime: caught outgoing message INSERT:', payload); // Replaced console.log
        handleNewMessage();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public', 
        table: 'messages',
        filter: `sender_id=eq.${partnerId},receiver_id=eq.${user.id}`,
      }, (payload) => {
        logger.debug('Realtime: caught incoming message INSERT:', payload); // Replaced console.log
        handleNewMessage();
      })
      .subscribe((status) => {
        logger.debug('✅ Realtime subscription status:', status); // Replaced console.log
        
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
        logger.debug('❌ Cleaning up realtime subscription'); // Replaced console.log
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        hasSubscribed.current = false;
      }
    };
  }, [user?.id, partnerId, handleNewMessage, archiveOldMessages]);

  return {};
};
