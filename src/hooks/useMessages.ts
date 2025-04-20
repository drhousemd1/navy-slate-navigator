import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useMessagesFetch } from './messages/useMessagesFetch';
import { useMessageSend } from './messages/useMessageSend';
import { useImageUpload } from './messages/useImageUpload';
import { useRealtimeMessages } from './messages/useRealtimeMessages';

export type { Message } from './messages/types';

export const useMessages = (initialPartnerId?: string) => {
  const { user } = useAuth();
  const [partnerId, setPartnerId] = useState<string | undefined>(initialPartnerId);
  
  useEffect(() => {
    const fetchPartnerId = async () => {
      if (!user || partnerId) return;
      
      try {
        const { data } = await getSupabaseClient()
          .from('profiles')
          .select('linked_partner_id')
          .eq('id', user.id)
          .single();
        
        const newPartnerId = data?.linked_partner_id || user.id;
        console.log('Setting partnerId to:', newPartnerId);
        setPartnerId(newPartnerId);
      } catch (err) {
        console.error('Error fetching partner ID:', err);
        setPartnerId(user.id);
      }
    };
    
    fetchPartnerId();
  }, [user, partnerId]);
  
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
  
  useRealtimeMessages(refetch, partnerId);

  const getPartnerId = async (): Promise<string | undefined> => {
    return partnerId;
  };

  const sendMessage = async (content: string, receiverId: string, imageUrl: string | null = null) => {
    const result = await sendMessageBase(content, receiverId, imageUrl);
    
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
    partnerId,
    getPartnerId
  };
};
