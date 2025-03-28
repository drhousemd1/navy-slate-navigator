
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
    try {
      let imageUrl = null;
      
      if (imageFile) {
        console.log('Uploading image file:', imageFile.name);
        imageUrl = await uploadImage(imageFile);
        
        if (!imageUrl) {
          console.error('Failed to upload image');
        } else {
          console.log('Image uploaded successfully:', imageUrl);
        }
        setImageFile(null);
      }
      
      // Send the message with the image URL if available
      const result = await sendMessageBase(content, receiverId, imageUrl);
      
      // Force a refetch immediately after sending
      refetch();
      
      return result;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      // Ensure we still clean up the image file on error
      setImageFile(null);
      throw error;
    }
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
