
import React, { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Message } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessageItemProps {
  message: Message;
  isSentByMe: boolean;
  userNickname: string | null;
  onImageLoad?: () => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isSentByMe,
  userNickname,
  onImageLoad
}) => {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAvatar = async () => {
      const targetUserId = isSentByMe ? user?.id : message.sender_id;
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', targetUserId)
        .single();

      if (!error && data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    };
    fetchAvatar();
  }, [isSentByMe, user?.id, message.sender_id]);

  const formatMessageTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col my-2" ref={messageRef}>
      <div className={`w-full text-xxs text-white opacity-40 mb-1 ${isSentByMe ? 'text-right pr-4' : 'text-left pl-4'}`}>
        {formatMessageTime(message.created_at)}
      </div>

      <div className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex ${isSentByMe ? 'flex-row' : 'flex-row-reverse'} items-start max-w-[90%] relative`}>
          <Avatar className={`h-8 w-8 border border-light-navy ${isSentByMe ? '-ml-3 z-10' : '-mr-3 z-10'}`}>
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={userNickname || 'User'} />
            ) : (
              <AvatarFallback className="bg-light-navy text-nav-active text-xs">
                {(userNickname?.charAt(0) || 'U').toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>

          <div className={`mx-2 p-3 rounded-lg min-w-[160px] ${isSentByMe ? 'bg-cyan-800 text-white rounded-tl-none' : 'bg-navy border border-light-navy text-white rounded-tr-none'}`}>
            <div className="flex flex-col">
              <span className="font-semibold text-xs mb-1">
                {isSentByMe ? userNickname : 'Partner'}
              </span>
              {message.content && (
                <p className="text-sm break-words whitespace-pre-wrap">
                  {message.content}
                </p>
              )}
              {message.image_url && (
                <>
                  <img
                    src={message.image_url}
                    alt="Sent image"
                    className="mt-2 rounded-md max-h-60 object-contain border border-light-navy cursor-pointer"
                    onClick={() => setIsImageOpen(true)}
                    onLoad={onImageLoad}
                    onError={(e) => e.currentTarget.style.display = 'none'}
                  />

                  <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}>
                    <DialogContent className="max-w-[90vw] max-h-[90vh] w-auto p-0 bg-black/80 border-none flex items-center justify-center">
                      <div className="relative">
                        <img
                          src={message.image_url}
                          alt="Full image"
                          className="max-w-full max-h-[80vh] object-contain rounded-lg"
                        />
                        <Button
                          className="absolute top-2 right-2 rounded-full w-8 h-8 p-0 bg-black/50 hover:bg-black/70"
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsImageOpen(false)}
                        >
                          <X className="h-5 w-5 text-white" />
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
