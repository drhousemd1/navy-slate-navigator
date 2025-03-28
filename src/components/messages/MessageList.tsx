
import React, { useRef, useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Message } from '@/hooks/messages/types';
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
  
  // Add detailed raw message logging
  useEffect(() => {
    console.log('[MessageList] Raw message list:', messages);
  }, [messages]);
  
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

  // Log the last message before attempting to scroll to it
  useEffect(() => {
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      console.log('[MessageList] Scrolling to last message:', {
        id: last.id,
        content: last.content,
        image_url: last.image_url
      });
    }
  }, [messages]);

  // Simplified scroll handling - always scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      console.log('[MessageList] Messages updated, scrolling to bottom');
      setTimeout(() => {
        if (messageEndRef.current) {
          messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
          console.log('[MessageList] Scrolled to bottom after message update');
        }
      }, 100); // Small delay to ensure DOM is updated
    }
  }, [messages]);

  // Scroll to bottom immediately on component mount
  useEffect(() => {
    console.log('[MessageList] Component mounted, scrolling to bottom');
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, []);

  // Handle image load events to trigger re-scrolling
  const handleImageLoaded = () => {
    console.log('[MessageList] Image loaded, scrolling');
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
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
            // Add critical log right before mapping to see all messages that should be rendered
            console.log('[MessageList] About to render messages:', messages.map(m => ({
              id: m.id,
              content: m.content,
              image_url: m.image_url
            }))),
            
            messages.map((msg: Message) => {
              // Log each message key during the mapping
              console.log('[MessageList] Rendering message with key:', msg.id);
              
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
          {/* This div is the target for scrolling to the bottom - increased height for visibility */}
          <div ref={messageEndRef} style={{ height: '10px', width: '100%' }} />
        </div>
      </ScrollArea>
    </div>
  );
};

export default MessageList;
