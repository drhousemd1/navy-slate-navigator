
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
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);
  const [prevMessageCount, setPrevMessageCount] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // This function handles all scrolling to bottom scenarios with maximum reliability
  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    if (scrollAreaViewportRef.current) {
      const scrollElement = scrollAreaViewportRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
      console.log('[MessageList] Scrolled to bottom, height:', scrollElement.scrollHeight);
    } else if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior });
    }
  };

  // Force scroll on initial load
  useEffect(() => {
    if (initialLoad && messages.length > 0) {
      console.log('[MessageList] Initial load with', messages.length, 'messages, scrolling to bottom');
      setInitialLoad(false);
      
      // Use immediate scroll and multiple delayed scrolls for reliability
      scrollToBottom();
      setTimeout(() => scrollToBottom(), 100);
      setTimeout(() => scrollToBottom(), 300);
    }
  }, [initialLoad, messages.length]);

  // Auto-scroll when message count changes (new messages)
  useEffect(() => {
    if (messages.length > prevMessageCount) {
      console.log('[MessageList] New messages detected:', messages.length - prevMessageCount, 'messages added');
      
      // Immediate scroll and multiple delayed scrolls
      scrollToBottom('smooth');
      setTimeout(() => scrollToBottom('smooth'), 100);
      setTimeout(() => scrollToBottom('smooth'), 300);
    }
    
    // Always update the previous count
    setPrevMessageCount(messages.length);
  }, [messages.length, prevMessageCount]);

  // Handle image load events to trigger re-scrolling
  const handleImageLoaded = () => {
    console.log('[MessageList] Image loaded, scrolling to bottom');
    scrollToBottom('smooth');
    setTimeout(() => scrollToBottom('smooth'), 200);
  };

  // Force scroll to bottom when viewport ref is captured
  useEffect(() => {
    if (scrollAreaViewportRef.current && messages.length > 0) {
      console.log('[MessageList] Viewport ref updated, scrolling to bottom');
      scrollToBottom();
    }
  }, [scrollAreaViewportRef.current, messages.length]);

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
      
      <ScrollArea 
        className="flex-1 px-4 overflow-y-auto" 
        ref={(node) => {
          // Access the actual viewport div for direct scrolling
          if (node) {
            const viewport = node.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport && viewport instanceof HTMLDivElement) {
              scrollAreaViewportRef.current = viewport;
            }
          }
        }}
      >
        <div className="space-y-4 pb-32">
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
          {/* Increased the height at the bottom for more space */}
          <div 
            ref={messageEndRef} 
            style={{ height: '150px', width: '100%' }} 
            id="message-end"
            className="bg-transparent"
          />
        </div>
      </ScrollArea>
    </div>
  );
};

export default MessageList;
