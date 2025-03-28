
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
  const [hasNewMessage, setHasNewMessage] = useState(false);
  
  console.log('[MessageList] Rendering with', messages.length, 'messages');
  if (messages.length > 0) {
    console.log('[MessageList] Last message ID:', messages[messages.length - 1].id);
    console.log('[MessageList] Last message content:', messages[messages.length - 1].content);
  }

  // Force scroll to bottom on initial load
  useEffect(() => {
    if (initialLoad && messages.length > 0) {
      console.log('[MessageList] Initial load, forcing scroll to bottom');
      setInitialLoad(false);
      
      const forceScrollToBottom = () => {
        if (scrollAreaViewportRef.current) {
          const scrollElement = scrollAreaViewportRef.current;
          scrollElement.scrollTop = scrollElement.scrollHeight;
          console.log('[MessageList] Force scrolled viewport to bottom:', scrollElement.scrollHeight);
        } else if (messageEndRef.current) {
          messageEndRef.current.scrollIntoView({ behavior: 'auto' });
          console.log('[MessageList] Force scrolled using messageEndRef');
        }
      };
      
      // Try multiple times with increasing delays
      forceScrollToBottom();
      setTimeout(forceScrollToBottom, 100);
      setTimeout(forceScrollToBottom, 300);
      setTimeout(forceScrollToBottom, 500);
    }
  }, [initialLoad, messages.length]);

  // Detect new messages
  useEffect(() => {
    if (messages.length > prevMessageCount) {
      console.log('[MessageList] New message detected! Count changed from', 
                  prevMessageCount, 'to', messages.length);
      setHasNewMessage(true);
      // Directly attempt to scroll here first
      if (scrollAreaViewportRef.current) {
        const scrollElement = scrollAreaViewportRef.current;
        scrollElement.scrollTop = scrollElement.scrollHeight;
        console.log('[MessageList] Immediate scroll to bottom on new message:', scrollElement.scrollHeight);
      }
    }
    
    // Always update the previous count
    setPrevMessageCount(messages.length);
  }, [messages.length, prevMessageCount]);

  // Handle scrolling for new messages with animation frame for timing
  useEffect(() => {
    if (hasNewMessage) {
      console.log('[MessageList] Handling new message scroll');
      
      const scrollToBottom = () => {
        // Try to scroll the viewport directly first
        if (scrollAreaViewportRef.current) {
          const scrollElement = scrollAreaViewportRef.current;
          scrollElement.scrollTop = scrollElement.scrollHeight;
          console.log('[MessageList] Scrolled viewport to bottom:', scrollElement.scrollHeight);
        } 
        // Fall back to messageEndRef if needed
        else if (messageEndRef.current) {
          messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
          console.log('[MessageList] Scrolled using messageEndRef');
        }
      };
      
      // Use requestAnimationFrame to ensure we're in the next paint cycle
      requestAnimationFrame(() => {
        scrollToBottom();
        // Additional attempts with timeouts for reliability
        setTimeout(scrollToBottom, 50);
        setTimeout(scrollToBottom, 200);
        setTimeout(scrollToBottom, 500);
      });
      
      setHasNewMessage(false);
    }
  }, [hasNewMessage]);

  // Handle image load events to trigger re-scrolling
  const handleImageLoaded = () => {
    console.log('[MessageList] Image loaded, will scroll to bottom');
    
    // Schedule multiple scroll attempts
    const scrollAfterImageLoad = () => {
      if (scrollAreaViewportRef.current) {
        const scrollElement = scrollAreaViewportRef.current;
        scrollElement.scrollTop = scrollElement.scrollHeight;
        console.log('[MessageList] Scrolled after image load:', scrollElement.scrollHeight);
      } else if (messageEndRef.current) {
        messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
        console.log('[MessageList] Scrolled using messageEndRef after image load');
      }
    };
    
    // Multiple attempts with increasing delays
    setTimeout(scrollAfterImageLoad, 50);
    setTimeout(scrollAfterImageLoad, 150);
    setTimeout(scrollAfterImageLoad, 350);
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
      
      <ScrollArea 
        className="flex-1 px-4 overflow-y-auto" 
        ref={(node) => {
          // Access the actual viewport div for direct scrolling
          if (node) {
            const viewport = node.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport && viewport instanceof HTMLDivElement) {
              scrollAreaViewportRef.current = viewport;
              console.log('[MessageList] ScrollArea viewport ref captured');
            }
          }
        }}
      >
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
          <div 
            ref={messageEndRef} 
            style={{ height: '20px', width: '100%' }} 
            id="message-end"
            className="bg-transparent"
          />
        </div>
      </ScrollArea>
    </div>
  );
};

export default MessageList;
