import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth/AuthContext';

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
        const updated = [...oldData, newMessage]; // force new array
        return updated;
      });

      // Also force a re-fetch after delay to stay fresh
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['messages', user?.id] });
      }, 1000);
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
