
// Update import path for the auth hook
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMessagesFetch } from './messages/useMessagesFetch';
import { useMessageSend } from './messages/useMessageSend';
import { useImageUpload } from './messages/useImageUpload';
import { useRealtimeMessages } from './messages/useRealtimeMessages';

export type { Message } from './messages/types';

export const useMessages = (initialPartnerId?: string) => {
  const { user } = useAuth();
  const [partnerId, setPartnerId] = useState<string | undefined>(initialPartnerId);
  
  // Fetch partner ID if not provided
  useEffect(() => {
    const fetchPartnerId = async () => {
      if (!user || partnerId) return;
      
      try {
        const { data } = await supabase
          .from('profiles')
          .select('linked_partner_id')
          .eq('id', user.id)
          .single();
        
        // For testing without a partner, use the user's own ID
        const newPartnerId = data?.linked_partner_id || user.id;
        console.log('Setting partnerId to:', newPartnerId);
        setPartnerId(newPartnerId);
      } catch (err) {
        console.error('Error fetching partner ID:', err);
        // Fallback to user's own ID for testing
        setPartnerId(user.id);
      }
    };
    
    fetchPartnerId();
  }, [user, partnerId]);
  
  // Import hook functionalities
  const { 
    messages, 
    isLoading, 
    error, 
    loadOlderMessages,
    loadingOlder,
    refetch
  } = useMessagesFetch(partnerId);
  
  const { 
    imageFile, 
    setImageFile, 
    isUploading, 
    uploadImage 
  } = useImageUpload();
  
  const { sendMessage: sendMessageBase } = useMessageSend();
  
  // Set up realtime subscription with the stable partnerId
  useRealtimeMessages(refetch, partnerId);

  // Get partner ID for use in messages page (to avoid duplicate fetching)
  const getPartnerId = async (): Promise<string | undefined> => {
    return partnerId;
  };

  // Combined send message function that handles image upload if needed
  const sendMessage = async (content: string, receiverId: string, imageUrl: string | null = null) => {
    // Wait for the message to be sent and then return the result
    const result = await sendMessageBase(content, receiverId, imageUrl);
    
    // Force a refetch to ensure the UI is updated with the latest message
    await refetch();
    
    return result;
  };

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    loadOlderMessages,
    imageFile,
    setImageFile,
    isUploading,
    loadingOlder,
    refetch,
    uploadImage,
    partnerId,  // Expose the partnerId directly
    getPartnerId  // Keep for backward compatibility
  };
};
