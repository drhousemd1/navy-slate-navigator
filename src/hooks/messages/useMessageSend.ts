
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
      
      return data[0];
    },
    onSuccess: (newMessage) => {
      // Update the query cache with the new message to make it appear immediately
      queryClient.setQueryData(['messages', user?.id], (oldData: any[] = []) => {
        // Add the new message to the end of the array (newest messages at the bottom)
        return [...oldData, newMessage];
      });
      
      // Also invalidate the query to ensure latest data is fetched
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
    return sendMessageMutation.mutateAsync({ content, receiverId, imageUrl });
  };

  return {
    sendMessage,
    sendMessageMutation
  };
};
