
import React, { useRef, useLayoutEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import MessageItem from './MessageItem';
import { Button } from '@/components/ui/button';
import { Message } from '@/hooks/useMessages';

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

  useLayoutEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
  }, [messages]);

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

      <ScrollArea className="flex-1 px-4 overflow-y-auto pb-[130px]">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-gray-400">No messages yet. Send the first one!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSentByMe = msg.sender_id === userId;
              return (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  isSentByMe={isSentByMe}
                  userNickname={userNickname}
                  userProfileImage={userProfileImage}
                  onImageLoad={() => {
                    if (messageEndRef.current) {
                      messageEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }
                  }}
                />
              );
            })
          )}
          <div ref={messageEndRef} className="h-1" />
        </div>
      </ScrollArea>
    </div>
  );
};

export default MessageList;
