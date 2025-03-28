
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
      
      console.log('Message sent successfully:', data[0]);
      return data[0];
    },
    onSuccess: (newMessage) => {
      queryClient.setQueryData(['messages', user?.id], (oldData: any) => {
        if (!oldData) return [newMessage];
        const exists = oldData.some((msg: any) => msg.id === newMessage.id);
        if (exists) return oldData;
        return [...oldData, newMessage];
      });

      // Optionally: delay invalidate to allow DB to catch up
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['messages', user?.id] });
      }, 1000); // Give Supabase time to index it
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
    console.log('Sending message:', { content, receiverId, imageUrl });
    return sendMessageMutation.mutateAsync({ content, receiverId, imageUrl });
  };

  return {
    sendMessage,
    sendMessageMutation
  };
};
