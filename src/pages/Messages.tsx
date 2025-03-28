
import React, { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useMessages';
import { toast } from '@/hooks/use-toast';
import MessageList from '@/components/messages/MessageList';
import MessageInput from '@/components/messages/MessageInput';

const Messages: React.FC = () => {
  const { user, getNickname, getProfileImage } = useAuth();
  const [message, setMessage] = useState('');
  const messagesSentRef = useRef(0);
  
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
  
  useEffect(() => {
    if (!isLoading && partnerId) {
      console.log('[Messages] Component mounted with partnerId:', partnerId, ', forcing refetch');
      refetch();
      
      const intervalId = setInterval(() => {
        console.log('[Messages] Scheduled refetch running');
        refetch();
      }, 5000);
      
      return () => clearInterval(intervalId);
    }
  }, [partnerId, isLoading, refetch]);

  const userNickname = getNickname();
  const userProfileImage = getProfileImage();

  const handleSendMessage = useCallback(async () => {
    if (!user || (!message.trim() && !imageFile)) return;
    
    try {
      const receiverId = partnerId || user.id;
      const currentMessage = message;
      const currentMessageCount = messagesSentRef.current + 1;
      messagesSentRef.current = currentMessageCount;
      
      setMessage('');
      
      console.log(`[Messages] handleSendMessage (${currentMessageCount}): Starting message send process`);
      let uploadedImageUrl = null;
      
      if (imageFile) {
        console.log(`[Messages] handleSendMessage (${currentMessageCount}): Uploading image`);
        uploadedImageUrl = await uploadImage(imageFile);
        setImageFile(null);
        console.log(`[Messages] handleSendMessage (${currentMessageCount}): Image uploaded:`, uploadedImageUrl);
      }
      
      console.log(`[Messages] handleSendMessage (${currentMessageCount}): Sending message with content:`, currentMessage);
      await sendMessage(currentMessage, receiverId, uploadedImageUrl);
      console.log(`[Messages] handleSendMessage (${currentMessageCount}): Message sent successfully`);
      
      console.log(`[Messages] handleSendMessage (${currentMessageCount}): Initial refetch`);
      await refetch();
      
      const delayedRefetches = [50, 200, 500, 1000];
      for (const delay of delayedRefetches) {
        setTimeout(async () => {
          console.log(`[Messages] handleSendMessage (${currentMessageCount}): Delayed refetch (${delay}ms)`);
          await refetch();
        }, delay);
      }
      
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

  useEffect(() => {
    if (messages.length > 0) {
      console.log(`[Messages] Currently have ${messages.length} messages`);
      console.log(`[Messages] Last message ID: ${messages[messages.length-1].id}`);
      console.log(`[Messages] Last message content: ${messages[messages.length-1].content}`);
    }
  }, [messages]);

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <div className="bg-navy border-b border-light-navy py-4 px-4">
          <h1 className="text-xl font-semibold text-white">Messages</h1>
          <p className="text-gray-400 text-sm">Chat with your partner</p>
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden h-[calc(100vh-10rem)] pb-4">
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
        
        <div className="pb-0">
          <MessageInput
            message={message}
            setMessage={setMessage}
            imageFile={imageFile}
            setImageFile={setImageFile}
            handleSendMessage={handleSendMessage}
            isUploading={isUploading}
          />
        </div>
      </div>
    </AppLayout>
  );
};

export default Messages;
