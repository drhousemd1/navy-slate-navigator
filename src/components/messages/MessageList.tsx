
import React, { useRef, useLayoutEffect, useImperativeHandle, forwardRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import MessageItem from './MessageItem';
import { Button } from '@/components/ui/button';
import { Message } from '@/hooks/useMessages';

interface MessageListProps {
  messages: Message[];
  loadingOlder: boolean;
  handleLoadOlderMessages: () => void;
  userNickname: string | null;
  userId: string | undefined;
}

const MessageList = forwardRef<
  { scrollToBottom: (behavior: ScrollBehavior) => void },
  MessageListProps
>(({
  messages,
  loadingOlder,
  handleLoadOlderMessages,
  userNickname,
  userId
}, ref) => {
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Expose the scrollToBottom method to parent components
  useImperativeHandle(ref, () => ({
    scrollToBottom: (behavior: ScrollBehavior = 'auto') => {
      if (messageEndRef.current) {
        console.log('[MessageList] Manual scrollToBottom called with behavior:', behavior);
        messageEndRef.current.scrollIntoView({ behavior, block: 'end' });
      }
    }
  }));

  // Scroll to bottom when messages load or change
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
                  onImageLoad={() => {
                    // Add a short timeout to ensure layout settles first
                    setTimeout(() => {
                      if (messageEndRef.current) {
                        messageEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
                      }
                    }, 100);
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
});

MessageList.displayName = 'MessageList';

export default MessageList;
