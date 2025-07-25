
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { PostgrestError } from '@supabase/supabase-js';
import { useSmartMessageNotifications } from '../useSmartMessageNotifications';

interface MessageSendResult {
  id: string;
}

export const useMessageSend = () => {
  const { user, getNickname } = useAuth();
  const { sendNewMessageNotification } = useSmartMessageNotifications();

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
        logger.error('Error sending message:', error);
        throw error;
      }

      // Send push notification if conditions are met
      try {
        const senderName = getNickname() || 'Someone';
        const messageContent = content.trim() || (imageUrl ? '📸 Image' : '');
        await sendNewMessageNotification(receiverId, senderName, messageContent);
      } catch (notificationError) {
        // Don't fail the message send if notification fails
        logger.warn('Failed to send push notification:', notificationError);
      }
      
      return (data as MessageSendResult).id;
    } catch (err) {
      const error = err as PostgrestError | Error;
      logger.error('Error in sendMessage:', error);
      throw error;
    }
  };

  return {
    sendMessage,
  };
};
