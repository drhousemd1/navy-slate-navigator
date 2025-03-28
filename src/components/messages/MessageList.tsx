
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const [prevMessageCount, setPrevMessageCount] = useState(0);
  
  // Function to scroll to the bottom
  const scrollToBottom = () => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ block: 'start', behavior: 'auto' });
      console.log('[MessageList] Scrolled to bottom using messageEndRef');
    }
  };

  // Initial scroll when component mounts
  useEffect(() => {
    if (messages.length > 0) {
      console.log('[MessageList] Initial mount with messages, scrolling to bottom');
      
      // Multiple scroll attempts to ensure it works
      setTimeout(scrollToBottom, 0);
      setTimeout(scrollToBottom, 50);
      setTimeout(scrollToBottom, 150);
      setTimeout(scrollToBottom, 300);
    }
  }, []);

  // Scroll when new messages are added
  useEffect(() => {
    if (messages.length > prevMessageCount) {
      console.log('[MessageList] New messages detected, scrolling to bottom');
      
      // More aggressive scrolling with multiple attempts
      setTimeout(scrollToBottom, 0);
      setTimeout(scrollToBottom, 50);
      setTimeout(scrollToBottom, 150);
      setTimeout(scrollToBottom, 300);
      setTimeout(scrollToBottom, 500);
    }
    
    setPrevMessageCount(messages.length);
  }, [messages.length]);

  // Handle image load events to scroll again
  const handleImageLoaded = () => {
    console.log('[MessageList] Image loaded, scrolling to bottom');
    scrollToBottom();
    setTimeout(scrollToBottom, 100);
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
        ref={scrollAreaRef}
      >
        <div className="space-y-1 pt-1">
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
          {/* Invisible element at the bottom for scrolling target, with minimal height */}
          <div 
            ref={messageEndRef} 
            className="h-[80px] mt-0 mb-0"
            aria-hidden="true"
          />
        </div>
      </ScrollArea>
    </div>
  );
};

export default MessageList;
