
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

  useEffect(() => {
    if (initialLoad && messages.length > 0) {
      console.log('[MessageList] Initial load, forcing scroll to bottom');
      setInitialLoad(false);
      
      scrollToBottom();
      
      setTimeout(() => scrollToBottom(), 50);
      setTimeout(() => scrollToBottom(), 150);
      setTimeout(() => scrollToBottom(), 300);
      setTimeout(() => scrollToBottom(), 500);
    }
  }, [initialLoad, messages.length]);

  useEffect(() => {
    if (messages.length > prevMessageCount) {
      console.log('[MessageList] New message detected! Count changed from', 
                  prevMessageCount, 'to', messages.length);
      
      scrollToBottom('smooth');
      
      setTimeout(() => scrollToBottom('smooth'), 100); 
      setTimeout(() => scrollToBottom('smooth'), 300);
      setTimeout(() => scrollToBottom('smooth'), 600);
    }
    
    setPrevMessageCount(messages.length);
  }, [messages.length, prevMessageCount]);

  useLayoutEffect(() => {
    if (!messageEndRef.current) return;

    messageEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });

    messageEndRef.current.style.display = 'none';
    void messageEndRef.current.offsetHeight;
    messageEndRef.current.style.display = '';
  }, [messages]);

  const handleImageLoaded = () => {
    console.log('[MessageList] Image loaded, scrolling to bottom');
    scrollToBottom('smooth');
    setTimeout(() => scrollToBottom('smooth'), 200);
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
          if (node) {
            const viewport = node.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport && viewport instanceof HTMLDivElement) {
              scrollAreaViewportRef.current = viewport;
              console.log('[MessageList] ScrollArea viewport ref captured');
            }
          }
        }}
      >
        <div className="space-y-1 pb-1">
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
            style={{ height: '120px', width: '100%' }} 
            id="message-end"
            className="bg-transparent"
          />
        </div>
      </ScrollArea>
    </div>
  );
};

export default MessageList;
