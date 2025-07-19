import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useEffect } from 'react';

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query to get unread message count
  const { data: unreadCount = 0, isLoading } = useQuery({
    queryKey: ['unread-messages', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .is('read_at', null);

      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Function to mark messages as read
  const markMessagesAsRead = async (senderId?: string) => {
    if (!user?.id) return;

    const query = supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('receiver_id', user.id)
      .is('read_at', null);

    // If senderId is provided, only mark messages from that sender as read
    if (senderId) {
      query.eq('sender_id', senderId);
    }

    await query;

    // Invalidate the unread count query to refresh the badge
    queryClient.invalidateQueries({ queryKey: ['unread-messages', user.id] });
  };

  // Mark all messages as read (used when opening messages page)
  const markAllMessagesAsRead = () => markMessagesAsRead();

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('new-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          // Invalidate unread count when new message received
          queryClient.invalidateQueries({ queryKey: ['unread-messages', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          // Invalidate unread count when message is updated (marked as read)
          queryClient.invalidateQueries({ queryKey: ['unread-messages', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    unreadCount,
    isLoading,
    markMessagesAsRead,
    markAllMessagesAsRead,
  };
};