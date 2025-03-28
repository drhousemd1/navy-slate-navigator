
import React from 'react';

interface MessageItemProps {
  message: {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string | null;
    image_url: string | null;
    created_at: string;
  };
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
  if (!message) return null;

  return (
    <div className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'} px-4`}>
      <div className="flex items-start gap-2 max-w-[80%]">
        {/* Avatar */}
        <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs shrink-0">
          {userNickname?.[0] || '?'}
        </div>

        {/* Message bubble */}
        <div className="bg-navy text-white p-2 rounded-lg max-w-full">
          {message.content?.trim() && (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
          {message.image_url && (
            <img
              src={message.image_url}
              alt="message"
              className="rounded-md max-w-xs mt-2"
              onLoad={onImageLoad}
              onError={() => console.error('⚠️ Image failed to load:', message.image_url)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
