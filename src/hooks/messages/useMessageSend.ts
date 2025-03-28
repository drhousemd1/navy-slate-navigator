
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
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content,
          image_url: imageUrl
        })
        .select();
      
      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }
      
      return data[0];
    },
    onSuccess: (newMessage) => {
      // Only invalidate the query - rely on realtime subscription to update the UI
      // This avoids race conditions between manual cache updates and refetching
      queryClient.invalidateQueries({ queryKey: ['messages', user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Send a message function
  const sendMessage = async (content: string, receiverId: string, imageUrl: string | null = null) => {
    return sendMessageMutation.mutateAsync({ content, receiverId, imageUrl });
  };

  return {
    sendMessage,
    sendMessageMutation
  };
};
