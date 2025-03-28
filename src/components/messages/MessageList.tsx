
import React, { useRef, useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Message } from '@/hooks/useMessages';
import MessageItem from './MessageItem';

interface MessageListProps {
  messages: Message[];
  loadingOlder: boolean;
  handleLoadOlderMessages: () => void;
  userNickname: string | null;
  userProfileImage: string | null;
  userId: string | undefined;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  loadingOlder,
  handleLoadOlderMessages,
  userNickname,
  userProfileImage,
  userId
}) => {
  const messageEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [hasImages, setHasImages] = useState(false);
  const [prevMessageCount, setPrevMessageCount] = useState(0);
  
  // Add logging to track message updates
  useEffect(() => {
    console.log('[MessageList] messages updated:', messages.map(m => m.content));
  }, [messages]);
  
  // Check if messages contain images
  useEffect(() => {
    const containsImages = messages.some(msg => msg.image_url);
    setHasImages(containsImages);
  }, [messages]);

  // Track message count changes to detect new messages
  useEffect(() => {
    // If message count increased, it means a new message was added
    const hasNewMessage = messages.length > prevMessageCount;
    setPrevMessageCount(messages.length);
    
    if (hasNewMessage || messages.length === 1) {
      // Force immediate scroll for new messages
      if (messageEndRef.current) {
        messageEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      }
    }
  }, [messages, prevMessageCount]);

  // Additional scroll to bottom for images after they load
  useEffect(() => {
    if (hasImages && messages.length > 0) {
      const timer = setTimeout(() => {
        if (messageEndRef.current) {
          messageEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [hasImages, messages]);

  // Handle image load events to trigger re-scrolling
  const handleImageLoaded = () => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {messages.length > 0 && (
        <div className="py-2 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadOlderMessages}
            disabled={loadingOlder}
            className="bg-navy hover:bg-light-navy text-white border-light-navy"
          >
            {loadingOlder ? 'Loading...' : 'Load older messages'}
          </Button>
        </div>
      )}
      
      <ScrollArea className="flex-1 px-4 overflow-y-auto" ref={scrollAreaRef}>
        <div className="space-y-4 pb-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-gray-400">No messages yet. Send the first one!</p>
            </div>
          ) : (
            messages.map((msg: Message) => {
              const isSentByMe = msg.sender_id === userId;
              
              return (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  isSentByMe={isSentByMe}
                  userNickname={userNickname}
                  userProfileImage={userProfileImage}
                  onImageLoad={handleImageLoaded}
                />
              );
            })
          )}
          {/* This div is the target for scrolling to the bottom */}
          <div ref={messageEndRef} style={{ height: '1px', width: '100%' }} />
        </div>
      </ScrollArea>
    </div>
  );
};

export default MessageList;
