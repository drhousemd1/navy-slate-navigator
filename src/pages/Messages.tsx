
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useMessages';
import { toast } from '@/hooks/use-toast';
import MessageList from '@/components/messages/MessageList';
import MessageInput from '@/components/messages/MessageInput';

const Messages: React.FC = () => {
  const { user, getNickname, getProfileImage } = useAuth();
  const [message, setMessage] = useState('');
  
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
    refetch,
    uploadImage,
    partnerId
  } = useMessages();
  
  // Force refetch on component mount and when partnerId changes
  useEffect(() => {
    if (!isLoading && partnerId) {
      console.log('[Messages] Component mounted with partnerId:', partnerId, ', forcing refetch');
      refetch();
      
      // Also schedule additional refetches to ensure data is fresh
      const intervalId = setInterval(() => {
        console.log('[Messages] Scheduled refetch running');
        refetch();
      }, 5000);
      
      return () => clearInterval(intervalId);
    }
  }, [partnerId, isLoading, refetch]);

  const userNickname = getNickname();
  const userProfileImage = getProfileImage();

  // Memoize handleSendMessage to prevent unnecessary recreations
  const handleSendMessage = useCallback(async () => {
    if (!user || (!message.trim() && !imageFile)) return;
    
    try {
      const receiverId = partnerId || user.id;
      const currentMessage = message;
      setMessage(''); // Clear input immediately for better UX
      
      console.log('[Messages] handleSendMessage: Starting message send process');
      let uploadedImageUrl = null;
      
      if (imageFile) {
        console.log('[Messages] handleSendMessage: Uploading image');
        uploadedImageUrl = await uploadImage(imageFile);
        setImageFile(null); // Clear image after upload
        console.log('[Messages] handleSendMessage: Image uploaded:', uploadedImageUrl);
      }
      
      console.log('[Messages] handleSendMessage: Sending message with content:', currentMessage);
      await sendMessage(currentMessage, receiverId, uploadedImageUrl);
      console.log('[Messages] handleSendMessage: Message sent successfully');
      
      // Force multiple refetches to ensure UI is updated
      console.log('[Messages] handleSendMessage: Initial refetch');
      await refetch();
      
      // Schedule additional refetches to ensure UI is updated
      setTimeout(async () => {
        console.log('[Messages] handleSendMessage: Delayed refetch 1 (500ms)');
        await refetch();
      }, 500);
      
      setTimeout(async () => {
        console.log('[Messages] handleSendMessage: Delayed refetch 2 (1000ms)');
        await refetch();
      }, 1000);
      
    } catch (err) {
      console.error('[Messages] Error sending message:', err);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  }, [user, message, imageFile, partnerId, uploadImage, sendMessage, refetch]);

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
      console.error('[Messages] Error loading older messages:', err);
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
