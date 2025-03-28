
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
  
  // Debug log for messages updates
  useEffect(() => {
    console.log('[MessageList] Messages updated, count:', messages.length);
    if (messages.length > 0) {
      console.log('[MessageList] Last message:', messages[messages.length - 1]);
    }
  }, [messages]);

  // Detect new messages and scroll to bottom
  useEffect(() => {
    // If message count increased, it means a new message was added
    if (messages.length > prevMessageCount) {
      console.log('[MessageList] New message detected, scrolling to bottom');
      
      // Use setTimeout to ensure scrolling happens after render
      setTimeout(() => {
        if (messageEndRef.current) {
          messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
          console.log('[MessageList] Scrolled to bottom after new message');
        }
      }, 100);
    }
    
    // Always update the previous count
    setPrevMessageCount(messages.length);
  }, [messages.length, prevMessageCount]);

  // Force scroll to bottom on initial load
  useEffect(() => {
    if (messages.length > 0) {
      console.log('[MessageList] Initial load, forcing scroll to bottom');
      
      // Use both immediate and delayed scrolling for reliability
      if (messageEndRef.current) {
        // Immediate scroll without animation
        messageEndRef.current.scrollIntoView({ behavior: 'auto' });
        
        // Also try after a delay to catch any rendering delays
        setTimeout(() => {
          if (messageEndRef.current) {
            messageEndRef.current.scrollIntoView({ behavior: 'auto' });
            console.log('[MessageList] Forced scroll after delay');
          }
        }, 300);
      }
    }
  }, []);

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
              console.log('[MessageList] Rendering message with ID:', msg.id);
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
            style={{ height: '1px', width: '100%' }} 
            id="message-end"
          />
        </div>
      </ScrollArea>
    </div>
  );
};

export default MessageList;
