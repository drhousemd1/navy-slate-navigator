
import React, { useEffect, useRef } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Message } from '@/hooks/useMessages';

interface MessageItemProps {
  message: Message;
  isSentByMe: boolean;
  userNickname: string | null;
  userProfileImage: string | null;
  onImageLoad?: () => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isSentByMe,
  userNickname,
  userProfileImage,
  onImageLoad
}) => {
  const messageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Debug log for rendering
  useEffect(() => {
    console.log(`[MessageItem] Component mounted for message: ${message.id}, content: ${message.content?.substring(0, 20)}, has image: ${!!message.image_url}`);
    return () => {
      console.log(`[MessageItem] Component unmounted for message: ${message.id}`);
    };
  }, [message.id, message.content, message.image_url]);
  
  // Debug log for DOM presence
  useEffect(() => {
    if (messageRef.current) {
      console.log(`[MessageItem] Message ${message.id} is in the DOM`);
      
      // Log the position of the message element
      const rect = messageRef.current.getBoundingClientRect();
      console.log(`[MessageItem] Message ${message.id} position:`, {
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        visible: rect.top >= 0 && rect.bottom <= window.innerHeight
      });
    } else {
      console.log(`[MessageItem] Message ${message.id} is NOT in the DOM yet`);
    }
  }, [message.id]);
  
  const formatMessageTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      console.error('[MessageItem] Error formatting time:', error);
      return '';
    }
  };

  // Handle image load with better error handling
  const handleImageLoad = () => {
    console.log(`[MessageItem] Image loaded successfully for message: ${message.id}`);
    if (onImageLoad) {
      onImageLoad();
    }
  };

  const handleImageError = () => {
    console.error(`[MessageItem] Failed to load image for message: ${message.id}, URL: ${message.image_url}`);
  };

  // Check if message should be rendered - ALWAYS render if there's image or content
  const hasContent = message.content?.trim() !== '';
  const hasImage = !!message.image_url;
  
  // Log when a message has neither content nor image
  if (!hasContent && !hasImage) {
    console.log('[MessageItem] ⚠️ Message has no content or image:', message.id);
  }

  return (
    <div className="flex flex-col my-2" ref={messageRef}>
      {/* Timestamp above message bubble */}
      <div className={`w-full text-xxs text-white opacity-40 mb-1 ${isSentByMe ? 'text-right pr-4' : 'text-left pl-4'}`}>
        {formatMessageTime(message.created_at)}
      </div>
      
      <div 
        className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
        data-message-id={message.id}
      >
        <div className={`flex ${isSentByMe ? 'flex-row' : 'flex-row-reverse'} items-start max-w-[90%] relative`}>
          {/* Avatar */}
          <Avatar className={`h-8 w-8 border border-light-navy ${isSentByMe ? '-ml-3 z-10' : '-mr-3 z-10'}`}>
            {isSentByMe && userProfileImage ? (
              <AvatarImage 
                src={userProfileImage} 
                alt={userNickname || "Me"}
                onError={() => console.error('[MessageItem] Failed to load avatar image')}
              />
            ) : (
              <AvatarFallback className="bg-light-navy text-nav-active text-xs">
                {isSentByMe ? (userNickname?.charAt(0) || "M").toUpperCase() : "P"}
              </AvatarFallback>
            )}
          </Avatar>
          
          {/* Message bubble */}
          <div 
            className={`mx-2 p-3 rounded-lg min-w-[160px] ${
              isSentByMe
                ? 'bg-cyan-800 text-white rounded-tl-none'
                : 'bg-navy border border-light-navy text-white rounded-tr-none'
            }`}
          >
            <div className="flex flex-col">
              <span className="font-semibold text-xs mb-1">
                {isSentByMe ? userNickname : "Partner"}
              </span>
              
              {hasContent && (
                <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
              )}
              
              {message.image_url && (
                <div className="mt-2">
                  <a
                    href={message.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-fit max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg"
                  >
                    <img
                      src={message.image_url}
                      alt="Sent image"
                      className="rounded-md max-h-60 object-contain border border-light-navy"
                      onLoad={handleImageLoad}
                      onError={(e) => {
                        console.error("Image failed to load:", message.image_url);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
