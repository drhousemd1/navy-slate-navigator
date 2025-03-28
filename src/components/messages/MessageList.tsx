
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
  const [prevMessageCount, setPrevMessageCount] = useState(0);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  
  // Check if messages contain images
  const hasImages = messages.some(msg => msg.image_url);
  
  // Debug log for messages updates
  useEffect(() => {
    console.log('[MessageList] Messages updated, count:', messages.length);
  }, [messages]);

  // Detect new messages and trigger scroll
  useEffect(() => {
    // If message count increased, it means a new message was added
    if (messages.length > prevMessageCount) {
      console.log('[MessageList] New message detected, will scroll to bottom');
      setShouldScrollToBottom(true);
    }
    
    // Always update the previous count
    setPrevMessageCount(messages.length);
  }, [messages.length, prevMessageCount]);

  // Handle scrolling to bottom when new messages arrive
  useEffect(() => {
    if (shouldScrollToBottom) {
      console.log('[MessageList] Executing scroll to bottom');
      
      // Use requestAnimationFrame to ensure scrolling happens after render
      requestAnimationFrame(() => {
        if (messageEndRef.current) {
          messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
          console.log('[MessageList] Scrolled to bottom');
        }
      });
      
      // Reset the flag
      setShouldScrollToBottom(false);
    }
  }, [shouldScrollToBottom]);

  // Additional scroll handling for images after they load
  useEffect(() => {
    if (hasImages && messages.length > 0) {
      console.log('[MessageList] Images detected, setting additional scroll timeout');
      const timer = setTimeout(() => {
        if (messageEndRef.current) {
          messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
          console.log('[MessageList] Scrolled after image delay');
        }
      }, 500); // Give images time to load
      
      return () => clearTimeout(timer);
    }
  }, [hasImages, messages]);

  // Handle image load events to trigger re-scrolling
  const handleImageLoaded = () => {
    console.log('[MessageList] Image loaded, scrolling to bottom');
    
    // Use setTimeout to give a small delay after the image loads
    setTimeout(() => {
      if (messageEndRef.current) {
        messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Handle initial scroll (when component mounts or messages first load)
  useEffect(() => {
    if (messages.length > 0 && messageEndRef.current) {
      console.log('[MessageList] Initial loading, scrolling to bottom');
      messageEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, []);

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
