import React, { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/auth';
import { useMessages } from '@/hooks/useMessages';
import { toast } from '@/hooks/use-toast';
import MessageList from '@/components/messages/MessageList';
import MessageInput from '@/components/messages/MessageInput';
import { logger } from '@/lib/logger';

const Messages: React.FC = () => {
  const { user, getNickname } = useAuth();
  const [message, setMessage] = useState('');
  const messagesSentRef = useRef(0);
  const messageListRef = useRef<{ scrollToBottom: (behavior: ScrollBehavior) => void }>(null);
  
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
      logger.debug('[Messages] Component mounted with partnerId:', partnerId, ', forcing refetch');
      refetch();
      
      const intervalId = setInterval(() => {
        logger.debug('[Messages] Scheduled refetch running');
        refetch();
      }, 5000);
      
      return () => clearInterval(intervalId);
    }
  }, [partnerId, isLoading, refetch]);

  const userNickname = getNickname();

  const handleSendMessage = useCallback(async () => {
    if (!user || (!message.trim() && !imageFile)) return;
    
    try {
      const receiverId = partnerId || user.id;
      const currentMessage = message;
      const currentMessageCount = messagesSentRef.current + 1;
      messagesSentRef.current = currentMessageCount;
      
      setMessage('');
      
      logger.debug(`[Messages] handleSendMessage (${currentMessageCount}): Starting message send process`);
      let uploadedImageUrl = null;
      const hadImage = !!imageFile;
      
      if (imageFile) {
        logger.debug(`[Messages] handleSendMessage (${currentMessageCount}): Uploading image`);
        uploadedImageUrl = await uploadImage(imageFile);
        setImageFile(null);
        logger.debug(`[Messages] handleSendMessage (${currentMessageCount}): Image uploaded:`, uploadedImageUrl);
      }
      
      logger.debug(`[Messages] handleSendMessage (${currentMessageCount}): Sending message with content:`, currentMessage);
      await sendMessage(currentMessage, receiverId, uploadedImageUrl);
      logger.debug(`[Messages] handleSendMessage (${currentMessageCount}): Message sent successfully`);
      
      // Initial refetch to ensure new messages appear
      logger.debug(`[Messages] handleSendMessage (${currentMessageCount}): Initial refetch`);
      await refetch();
      
      // If message included an image, add a short delay then call scrollToBottom
      if (hadImage) {
        setTimeout(() => {
          if (messageListRef.current) {
            logger.debug(`[Messages] handleSendMessage (${currentMessageCount}): Forced scroll after image message`);
            messageListRef.current.scrollToBottom('auto');
          }
        }, 300);
      }
      
      // Multiple delayed refetches to ensure message appears
      const delayedRefetches = [50, 150, 300, 500, 1000, 2000];
      for (const delay of delayedRefetches) {
        setTimeout(async () => {
          logger.debug(`[Messages] handleSendMessage (${currentMessageCount}): Delayed refetch (${delay}ms)`);
          await refetch();
        }, delay);
      }
      
    } catch (err) {
      logger.error('[Messages] Error sending message:', err);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  }, [user, message, imageFile, partnerId, uploadImage, sendMessage, refetch, setImageFile]);

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
      logger.error('[Messages] Error loading older messages:', err);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      logger.debug(`[Messages] Currently have ${messages.length} messages`);
      logger.debug(`[Messages] Last message ID: ${messages[messages.length-1].id}`);
      logger.debug(`[Messages] Last message content: ${messages[messages.length-1].content}`);
    }
  }, [messages]);

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <div className="bg-navy border-b border-light-navy py-4 px-4">
          <h1 className="text-xl font-semibold text-white">Messages</h1>
          <p className="text-gray-400 text-sm">Chat with your partner</p>
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden">
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
              ref={messageListRef}
              messages={messages}
              loadingOlder={loadingOlder}
              handleLoadOlderMessages={handleLoadOlderMessages}
              userNickname={userNickname}
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
