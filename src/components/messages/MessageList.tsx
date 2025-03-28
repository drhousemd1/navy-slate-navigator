
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
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  
  // Add logging to track message updates with content and image availability
  useEffect(() => {
    console.log('[MessageList] messages updated:', 
      messages.map(m => ({ 
        content: m.content, 
        hasImage: !!m.image_url 
      }))
    );
  }, [messages]);
  
  // Check if messages contain images
  useEffect(() => {
    const containsImages = messages.some(msg => msg.image_url);
    setHasImages(containsImages);
    console.log('[MessageList] Contains images:', containsImages);
  }, [messages]);

  // Improved scroll handling for new messages
  useEffect(() => {
    // If message count increased, it means a new message was added
    const hasNewMessage = messages.length > prevMessageCount;
    setPrevMessageCount(messages.length);
    
    if (hasNewMessage || messages.length === 1) {
      console.log('[MessageList] New message detected, scrolling to bottom');
      setShouldScrollToBottom(true);
    }
  }, [messages, prevMessageCount]);

  // Separate effect for scrolling to ensure it happens after render
  useEffect(() => {
    if (shouldScrollToBottom) {
      console.log('[MessageList] Executing scroll to bottom');
      
      // Use requestAnimationFrame to ensure scrolling happens after render
      requestAnimationFrame(() => {
        if (messageEndRef.current) {
          messageEndRef.current.scrollIntoView({ behavior: 'auto' });
          console.log('[MessageList] Scrolled to bottom');
        }
      });
      
      setShouldScrollToBottom(false);
    }
  }, [shouldScrollToBottom, messages]);

  // Additional scroll to bottom for images after they load
  useEffect(() => {
    if (hasImages && messages.length > 0) {
      console.log('[MessageList] Has images, will scroll after timeout');
      const timer = setTimeout(() => {
        if (messageEndRef.current) {
          messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
          console.log('[MessageList] Scrolled after image load timeout');
        }
      }, 700); // Increased from 500ms to 700ms to give more time for images to load
      return () => clearTimeout(timer);
    }
  }, [hasImages, messages]);

  // Handle image load events to trigger re-scrolling
  const handleImageLoaded = () => {
    console.log('[MessageList] Image loaded, scrolling');
    if (messageEndRef.current) {
      // Use requestAnimationFrame for better timing
      requestAnimationFrame(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
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
