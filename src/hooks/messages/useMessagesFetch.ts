
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Message } from '../messages/types';
import { logger } from '@/lib/logger'; // Added logger import

export const useMessagesFetch = (partnerId?: string) => {
  const { user } = useAuth();
  const [oldestMessageDate, setOldestMessageDate] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // Get the current user's partner ID if not provided
  const getPartnerId = async (): Promise<string | undefined> => {
    if (partnerId) return partnerId;
    if (!user) return undefined;
    
    try {
      // Get the current user's linked partner from the profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('linked_partner_id')
        .eq('id', user.id)
        .single();
      
      if (error) {
        logger.error('Error getting partner ID:', error); // Replaced console.error
        // For testing without a partner, return the user's own ID
        return user.id;
      }
      
      // If no partner is linked, use the user's own ID for testing
      return data.linked_partner_id || user.id;
    } catch (err) {
      logger.error('Error in getPartnerId:', err); // Replaced console.error
      // Fallback to user's own ID for testing
      return user.id;
    }
  };

  // Fetch messages between the current user and their partner (or self for testing)
  const {
    data: messages = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['messages', user?.id, partnerId],
    queryFn: async () => {
      logger.debug('[QUERY] Refetching messages...'); // Replaced console.log
      const partnerIdValue = await getPartnerId();
      if (!user || !partnerIdValue) {
        return [];
      }

      logger.debug('[QUERY] Fetching messages between', user.id, 'and', partnerIdValue); // Replaced console.log
      // Modified query to work with messages to self for testing
      const { data, error: fetchError } = await supabase // aliased error
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerIdValue}),and(sender_id.eq.${partnerIdValue},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(25);
      
      if (fetchError) {
        logger.error('Error fetching messages:', fetchError); // Replaced console.error
        throw fetchError;
      }
      
      logger.debug('[QUERY] Fetched messages count:', data?.length || 0); // Replaced console.log
      logger.debug('[QUERY] fetched from Supabase:', data?.map(m => m.content)); // Replaced console.log
      
      // Return messages in ascending order for display (newest at bottom)
      return [...(data || [])].reverse();
    },
    enabled: !!user
  });

  // Load older messages (for pagination)
  const loadOlderMessages = async (oldestMessageDateParam: string): Promise<Message[]> => { // Renamed oldestMessageDate to avoid conflict
    const partnerIdValue = await getPartnerId();
    if (!user || !partnerIdValue) {
      return [];
    }

    setLoadingOlder(true);
    try {
      const { data, error: loadError } = await supabase // aliased error
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerIdValue}),and(sender_id.eq.${partnerIdValue},receiver_id.eq.${user.id})`)
        .lt('created_at', oldestMessageDateParam)
        .order('created_at', { ascending: false })
        .limit(25);
      
      if (loadError) {
        logger.error('Error loading older messages:', loadError); // Replaced console.error
        return [];
      }
      
      if (data && data.length > 0) {
        setOldestMessageDate(data[0].created_at);
      }
      
      return data || [];
    } finally {
      setLoadingOlder(false);
    }
  };

  // Initialize oldestMessageDate when messages are loaded
  if (messages.length > 0 && !oldestMessageDate) {
    setOldestMessageDate(messages[0].created_at);
  }

  return {
    messages,
    isLoading,
    error,
    loadOlderMessages,
    loadingOlder,
    getPartnerId,
    refetch
  };
};
