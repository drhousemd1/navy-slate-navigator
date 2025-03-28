
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Message } from '@/hooks/useMessages';

interface MessageItemProps {
  message: Message;
  isSentByMe: boolean;
  userNickname: string | null;
  userProfileImage: string | null;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isSentByMe,
  userNickname,
  userProfileImage
}) => {
  const formatMessageTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return '';
    }
  };

  return (
    <div 
      className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex ${isSentByMe ? 'flex-row-reverse' : 'flex-row'} items-start max-w-[80%] relative`}>
        <Avatar className={`h-8 w-8 border border-light-navy ${isSentByMe ? '-mr-3 z-10' : '-ml-3 z-10'}`}>
          <AvatarImage 
            src={isSentByMe ? userProfileImage : undefined} 
            alt={isSentByMe ? userNickname : "Partner"}
          />
          <AvatarFallback className="bg-light-navy text-nav-active text-xs">
            {isSentByMe ? userNickname?.charAt(0).toUpperCase() : "P"}
          </AvatarFallback>
        </Avatar>
        
        <div 
          className={`mx-2 p-3 rounded-lg ${
            isSentByMe
              ? 'bg-cyan-800 text-white rounded-tr-none'
              : 'bg-navy border border-light-navy text-white rounded-tl-none'
          }`}
        >
          <div className="flex flex-col">
            <span className="font-semibold text-xs mb-1">
              {isSentByMe ? userNickname : "Partner"}
            </span>
            
            {message.content && (
              <p className="text-sm break-words">{message.content}</p>
            )}
            
            {message.image_url && (
              <div className="mt-2">
                <img
                  src={message.image_url}
                  alt="Message attachment"
                  className="max-w-full rounded-md max-h-60 object-contain"
                />
              </div>
            )}
            
            <span className="text-xs opacity-70 mt-1 self-end">
              {formatMessageTime(message.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
