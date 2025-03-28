
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
    <div className="flex flex-col my-2">
      {/* Timestamp above message bubble, aligned to right for sent messages and left for received messages */}
      <div className={`w-full text-xxs text-white opacity-40 mb-1 ${isSentByMe ? 'text-right pr-4' : 'text-left pl-4'}`}>
        {formatMessageTime(message.created_at)}
      </div>
      
      <div 
        className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`flex ${isSentByMe ? 'flex-row' : 'flex-row-reverse'} items-start max-w-[90%] relative`}>
          {/* Avatar is on the right for sent messages and left for received messages (toward center) */}
          <Avatar className={`h-8 w-8 border border-light-navy ${isSentByMe ? '-ml-3 z-10' : '-mr-3 z-10'}`}>
            <AvatarImage 
              src={isSentByMe ? userProfileImage : undefined} 
              alt={isSentByMe ? userNickname : "Partner"}
            />
            <AvatarFallback className="bg-light-navy text-nav-active text-xs">
              {isSentByMe ? userNickname?.charAt(0).toUpperCase() : "P"}
            </AvatarFallback>
          </Avatar>
          
          <div 
            className={`mx-2 p-3 rounded-lg min-w-[180px] ${
              isSentByMe
                ? 'bg-cyan-800 text-white rounded-tl-none'
                : 'bg-navy border border-light-navy text-white rounded-tr-none'
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
                <div className="mt-1">
                  <img
                    src={message.image_url}
                    alt="Message attachment"
                    className="max-w-full rounded-md max-h-60 object-contain"
                  />
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
