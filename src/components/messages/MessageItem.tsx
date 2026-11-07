import { useColorScheme } from '@/contexts/ColorSchemeContext';
import React, { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { X, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Message, MessageScope, ConversationSummary } from '@/data/messages/types';
import { usePrivateMessageImage } from '@/hooks/messages/usePrivateMessageImage';

export default function MessageItem({ message, scope, conversation, onImageLoad }: {
  message: Message; scope: MessageScope; conversation: ConversationSummary; onImageLoad: () => void;
}) {
  const isLightScheme = useColorScheme().currentScheme === 'light-turquoise';
  const [isImageOpen, setIsImageOpen] = useState(false);
  const media = usePrivateMessageImage(scope, message.attachment?.id ?? null);
  const own = message.author === 'you';
  const label = own ? 'You' : conversation.label;
  const avatar = own ? null : conversation.partnerAvatarUrl;
  return <div className="flex flex-col my-2" data-message-id={message.id} data-incoming-unread={!own && message.readStatus !== 'read' ? 'true' : undefined}>
    <div className={`w-full text-xxs ${isLightScheme ? 'text-foreground' : 'text-white opacity-40'} mb-1 ${own ? 'text-right pr-4' : 'text-left pl-4'}`}><time dateTime={message.createdAt} title={new Date(message.createdAt).toLocaleString()}>{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</time></div>
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex ${own ? 'flex-row' : 'flex-row-reverse'} items-start gap-2`}>
        <Avatar className="h-8 w-8 border border-light-navy shrink-0">
          {avatar && <AvatarImage src={avatar} alt={label} />}
          <AvatarFallback className={`bg-light-navy ${isLightScheme ? 'text-foreground' : 'text-nav-active'} text-xs`}>{label.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className={`flex flex-col p-3 rounded-lg min-w-[200px] max-w-[75vw] ${own ? 'bg-cyan-800 text-white rounded-tl-none' : `bg-navy border border-light-navy ${isLightScheme ? 'text-foreground' : 'text-white'} rounded-tr-none`}`}>
          <span className="font-semibold text-xs mb-1">{label}</span>
          {message.content && <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>}
          {message.attachment && <div className="mt-2">
            {media.url ? <button type="button" aria-label="Open message image" className="relative group" onClick={() => setIsImageOpen(true)}>
              <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-md"><ZoomIn className="h-8 w-8 text-white" /></span>
              <img src={media.url} alt="Message image" className="rounded-md max-h-60 object-contain border border-light-navy" onLoad={onImageLoad} />
            </button> : media.error ? <div role="alert" className="text-sm"><p>{media.error}</p><Button variant="outline" size="sm" className={isLightScheme ? 'text-foreground' : undefined} onClick={media.retry}>Retry image</Button></div> : <p role="status" className={`text-xs ${isLightScheme && !own ? 'text-foreground' : 'text-gray-300'}`}>Loading image…</p>}
          </div>}
        </div>
      </div>
    </div>
    {media.url && <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}><DialogContent className="max-w-[90vw] max-h-[90vh] w-auto p-0 bg-transparent border-none">
      <DialogTitle className="sr-only">Message image</DialogTitle>
      <div className="relative w-full h-full flex items-center justify-center"><img src={media.url} alt="Full size message image" className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg" />
        <Button aria-label="Close image" className="absolute top-2 right-2 rounded-full w-8 h-8 p-0 bg-black/50 hover:bg-black/70" variant="ghost" size="icon" onClick={() => setIsImageOpen(false)}><X className="h-5 w-5 text-white" /></Button>
      </div>
    </DialogContent></Dialog>}
  </div>;
}
