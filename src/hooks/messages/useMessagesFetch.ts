
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Message } from '../messages/types';

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
        console.error('Error getting partner ID:', error);
        // For testing without a partner, return the user's own ID
        return user.id;
      }
      
      // If no partner is linked, use the user's own ID for testing
      return data.linked_partner_id || user.id;
    } catch (err) {
      console.error('Error in getPartnerId:', err);
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
      console.log('[QUERY] Refetching messages...');
      const partnerIdValue = await getPartnerId();
      if (!user || !partnerIdValue) {
        return [];
      }

      console.log('[QUERY] Fetching messages between', user.id, 'and', partnerIdValue);
      // Modified query to work with messages to self for testing
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerIdValue}),and(sender_id.eq.${partnerIdValue},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(25);
      
      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }
      
      console.log('[QUERY] Fetched messages count:', data?.length || 0);
      console.log('[QUERY] fetched from Supabase:', data?.map(m => m.content));
      
      // Return messages in ascending order for display (newest at bottom)
      return [...(data || [])].reverse();
    },
    enabled: !!user
  });

  // Load older messages (for pagination)
  const loadOlderMessages = async (oldestMessageDate: string): Promise<Message[]> => {
    const partnerIdValue = await getPartnerId();
    if (!user || !partnerIdValue) {
      return [];
    }

    setLoadingOlder(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerIdValue}),and(sender_id.eq.${partnerIdValue},receiver_id.eq.${user.id})`)
        .lt('created_at', oldestMessageDate)
        .order('created_at', { ascending: false })
        .limit(25);
      
      if (error) {
        console.error('Error loading older messages:', error);
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
