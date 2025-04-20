
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useMessageSend = () => {
  const { user } = useAuth();

  const sendMessage = async (content: string, receiverId: string, imageUrl: string | null = null): Promise<string | null> => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    if (!content.trim() && !imageUrl) {
      throw new Error('Message must have content or an image');
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content: content.trim() || null,
          image_url: imageUrl
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }
      
      return data.id;
    } catch (err) {
      console.error('Error in sendMessage:', err);
      throw err;
    }
  };

  return {
    sendMessage,
  };
};
