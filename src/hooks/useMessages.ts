
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMessagesFetch } from './messages/useMessagesFetch';
import { useMessageSend } from './messages/useMessageSend';
import { useImageUpload } from './messages/useImageUpload';
import { useRealtimeMessages } from './messages/useRealtimeMessages';

export type { Message } from './messages/types';

export const useMessages = (partnerId?: string) => {
  const { user } = useAuth();
  
  // Import hook functionalities
  const { 
    messages, 
    isLoading, 
    error, 
    loadOlderMessages,
    loadingOlder,
    getPartnerId,
    refetch
  } = useMessagesFetch();
  
  const { 
    imageFile, 
    setImageFile, 
    isUploading, 
    uploadImage 
  } = useImageUpload();
  
  const { sendMessage: sendMessageBase } = useMessageSend();
  
  // Set up realtime subscription
  useRealtimeMessages(refetch, getPartnerId);

  // Combined send message function that handles image upload if needed
  const sendMessage = async (content: string, receiverId: string) => {
    let imageUrl = null;
    
    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
      setImageFile(null);
    }
    
    const result = await sendMessageBase(content, receiverId, imageUrl);
    
    // Force a refetch after sending a message to update the UI
    setTimeout(() => {
      refetch();
    }, 300);
    
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
    refetch
  };
};
