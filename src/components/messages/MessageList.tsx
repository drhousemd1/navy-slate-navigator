
import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
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
  
  console.log('[MessageList] Rendering with', messages.length, 'messages');
  
  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    console.log('[MessageList] Attempting to scroll to bottom with behavior:', behavior);
    
    if (scrollAreaViewportRef.current) {
      const scrollElement = scrollAreaViewportRef.current;
      const scrollHeight = scrollElement.scrollHeight;
      scrollElement.scrollTop = scrollHeight;
      console.log('[MessageList] Scrolled viewport to bottom:', scrollHeight);
    } else if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior });
      console.log('[MessageList] Scrolled using messageEndRef');
    }
  };

  // Force initial scroll to bottom when messages first load
  useEffect(() => {
    if (messages.length > 0) {
      console.log('[MessageList] Messages loaded, forcing scroll to bottom');
      
      // Try multiple times with different delays to ensure scroll happens
      const scrollDelays = [0, 50, 150, 300, 500, 800, 1200];
      
      scrollDelays.forEach(delay => {
        setTimeout(() => {
          scrollToBottom();
          
          // Force a more aggressive scroll directly to the messageEndRef
          if (messageEndRef.current) {
            messageEndRef.current.scrollIntoView({ block: 'end' });
            console.log(`[MessageList] Forced aggressive scroll at ${delay}ms`);
          }
        }, delay);
      });
    }
  }, [messages.length]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessageCount) {
      console.log('[MessageList] New message detected! Count changed from', 
                  prevMessageCount, 'to', messages.length);
      
      // Multiple aggressive scroll attempts with different delays
      const scrollDelays = [0, 100, 300, 600, 1000];
      
      scrollDelays.forEach(delay => {
        setTimeout(() => {
          scrollToBottom('smooth');
          
          // Force a more aggressive scroll
          if (messageEndRef.current) {
            messageEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
            console.log(`[MessageList] Forced aggressive scroll for new message at ${delay}ms`);
          }
        }, delay);
      });
    }
    
    setPrevMessageCount(messages.length);
  }, [messages.length, prevMessageCount]);

  // Additional measure with useLayoutEffect to ensure scroll works
  useLayoutEffect(() => {
    if (messages.length > 0 && messageEndRef.current) {
      // Force scroll before layout calculations complete
      messageEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      console.log('[MessageList] useLayoutEffect forced scroll');
      
      // Schedule additional scrolls with small delays to handle any rendering delays
      setTimeout(() => {
        if (messageEndRef.current) {
          messageEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
        }
      }, 50);
      
      setTimeout(() => {
        if (messageEndRef.current) {
          messageEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
        }
      }, 200);
    }
  }, [messages]);

  const handleImageLoaded = () => {
    console.log('[MessageList] Image loaded, scrolling to bottom');
    
    // Multiple scroll attempts when an image loads
    scrollToBottom('smooth');
    
    const imageLoadDelays = [100, 200, 400];
    imageLoadDelays.forEach(delay => {
      setTimeout(() => {
        scrollToBottom('smooth');
        if (messageEndRef.current) {
          messageEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, delay);
    });
  };

  // The input box height is 60px and positioned at bottom-16 (64px)
  // Only need 4-8px of space between last message and input box

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
          if (node) {
            const viewport = node.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport && viewport instanceof HTMLDivElement) {
              scrollAreaViewportRef.current = viewport;
              console.log('[MessageList] ScrollArea viewport ref captured');
            }
          }
        }}
      >
        <div className="space-y-1 pb-4">
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
            style={{ height: '1px', marginBottom: '8px' }} 
            id="message-end"
            className="bg-transparent"
          />
        </div>
      </ScrollArea>
    </div>
  );
};

export default MessageList;
