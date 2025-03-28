
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
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Debug log for messages updates
  useEffect(() => {
    console.log('[MessageList] Messages updated, count:', messages.length);
    if (messages.length > 0) {
      console.log('[MessageList] First message:', messages[0].id);
      console.log('[MessageList] Last message:', messages[messages.length - 1]);
    }
  }, [messages]);

  // Handle initial load
  useEffect(() => {
    if (initialLoad && messages.length > 0) {
      console.log('[MessageList] Initial load, scrolling to bottom');
      setInitialLoad(false);
      
      // Schedule multiple scroll attempts to ensure it happens
      setTimeout(() => {
        if (messageEndRef.current) {
          console.log('[MessageList] Scrolling attempt 1');
          messageEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
      }, 100);
      
      setTimeout(() => {
        if (messageEndRef.current) {
          console.log('[MessageList] Scrolling attempt 2');
          messageEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
      }, 300);
      
      setTimeout(() => {
        if (messageEndRef.current) {
          console.log('[MessageList] Scrolling attempt 3');
          messageEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
      }, 500);
    }
  }, [initialLoad, messages.length]);

  // Detect new messages and scroll to bottom
  useEffect(() => {
    // If message count increased, it means a new message was added
    if (messages.length > prevMessageCount) {
      console.log('[MessageList] New message detected, scrolling to bottom. Count changed from', 
                  prevMessageCount, 'to', messages.length);
      
      // Try multiple scroll attempts with setTimeout for reliability
      const scrollToBottom = () => {
        if (messageEndRef.current) {
          console.log('[MessageList] Executing scroll to bottom');
          messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
        } else {
          console.log('[MessageList] messageEndRef is null, cannot scroll');
        }
      };
      
      // Schedule multiple attempts
      setTimeout(scrollToBottom, 50);
      setTimeout(scrollToBottom, 150);
      setTimeout(scrollToBottom, 300);
    }
    
    // Always update the previous count
    setPrevMessageCount(messages.length);
  }, [messages.length, prevMessageCount]);

  // Handle image load events to trigger re-scrolling
  const handleImageLoaded = () => {
    console.log('[MessageList] Image loaded, scrolling to bottom');
    
    if (messageEndRef.current) {
      console.log('[MessageList] Scrolling to bottom after image load');
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
      
      // Try again after a short delay
      setTimeout(() => {
        if (messageEndRef.current) {
          messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  // Debug scroll area ref
  useEffect(() => {
    console.log('[MessageList] ScrollArea ref:', scrollAreaRef.current ? 'exists' : 'null');
  }, [scrollAreaRef.current]);

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
          {/* This invisible div serves as the target for scrolling to the bottom */}
          <div 
            ref={messageEndRef} 
            style={{ height: '10px', width: '100%' }} 
            id="message-end"
            className="bg-transparent"
          />
        </div>
      </ScrollArea>
    </div>
  );
};

export default MessageList;
