
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useMessageSend = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Send a new message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ 
      content, 
      receiverId, 
      imageUrl = null 
    }: { 
      content: string; 
      receiverId: string; 
      imageUrl?: string | null 
    }) => {
      if (!user) throw new Error('User not authenticated');
      
      const messageData = {
        sender_id: user.id,
        receiver_id: receiverId,
        content: content.trim() || null,
        image_url: imageUrl
      };
      
      console.log('Sending message:', messageData);
      
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select();
      
      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }
      
      // Immediately invalidate queries to force a refresh
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      
      return data[0];
    },
    onSuccess: () => {
      // Additional invalidation for good measure
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error sending message",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    }
  });

  // Send a message function
  const sendMessage = async (content: string, receiverId: string, imageUrl: string | null = null) => {
    const result = await sendMessageMutation.mutateAsync({ content, receiverId, imageUrl });
    // Force an immediate refetch after sending
    queryClient.invalidateQueries({ queryKey: ['messages'] });
    return result;
  };

  return {
    sendMessage,
    sendMessageMutation
  };
};
