
import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useMessages';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import MessageList from '@/components/messages/MessageList';
import MessageInput from '@/components/messages/MessageInput';

const Messages: React.FC = () => {
  const { user, getNickname, getProfileImage } = useAuth();
  const [message, setMessage] = useState('');
  const [partnerId, setPartnerId] = useState<string | undefined>(undefined);
  const partnerIdRef = useRef<string | undefined>(undefined);
  
  // Fetch partner ID on component mount
  useEffect(() => {
    const fetchPartnerId = async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase
          .from('profiles')
          .select('linked_partner_id')
          .eq('id', user.id)
          .single();
        
        // For testing without a partner, use the user's own ID
        const newPartnerId = data?.linked_partner_id || user.id;
        setPartnerId(newPartnerId);
        partnerIdRef.current = newPartnerId;
      } catch (err) {
        console.error('Error fetching partner ID:', err);
        // Fallback to user's own ID for testing
        setPartnerId(user.id);
        partnerIdRef.current = user.id;
      }
    };
    
    fetchPartnerId();
  }, [user]);
  
  const {
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
  } = useMessages();

  // Force a refetch after the component mounts to ensure latest messages
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoading && partnerId) {
        refetch();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [partnerId, isLoading, refetch]);

  const userNickname = getNickname();
  const userProfileImage = getProfileImage();

  const handleSendMessage = async () => {
    if (!user || (!message.trim() && !imageFile)) return;
    
    try {
      const receiverId = partnerId || user.id;
      const currentMessage = message; // Store the current message value
      
      // Clear the message input immediately for better UX
      setMessage('');
      
      await sendMessage(currentMessage, receiverId);
      
      // Force a refetch to show the message immediately
      refetch();
    } catch (err) {
      console.error('Error sending message:', err);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleLoadOlderMessages = async () => {
    if (messages.length === 0 || loadingOlder) return;
    
    try {
      const oldestMessage = messages[0];
      const olderMessages = await loadOlderMessages(oldestMessage.created_at);
      
      if (olderMessages.length === 0) {
        toast({
          title: "No more messages",
          description: "You've reached the beginning of your conversation.",
        });
      }
    } catch (err) {
      console.error('Error loading older messages:', err);
    }
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <div className="bg-navy border-b border-light-navy py-4 px-4">
          <h1 className="text-xl font-semibold text-white">Messages</h1>
          <p className="text-gray-400 text-sm">Chat with your partner</p>
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden h-[calc(100vh-10rem)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">Loading messages...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-red-400">Error loading messages: {(error as Error).message}</p>
            </div>
          ) : (
            <MessageList
              messages={messages}
              loadingOlder={loadingOlder}
              handleLoadOlderMessages={handleLoadOlderMessages}
              userNickname={userNickname}
              userProfileImage={userProfileImage}
              userId={user?.id}
            />
          )}
        </div>
        
        <MessageInput
          message={message}
          setMessage={setMessage}
          imageFile={imageFile}
          setImageFile={setImageFile}
          handleSendMessage={handleSendMessage}
          isUploading={isUploading}
        />
      </div>
    </AppLayout>
  );
};

export default Messages;
