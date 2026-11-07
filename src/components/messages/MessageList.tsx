import React, { useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import MessageItem from './MessageItem';
import { Button } from '@/components/ui/button';
import type { Message, MessageScope, ConversationSummary } from '@/data/messages/types';

export default function MessageList({ messages, scope, conversation, loadingOlder, hasOlder, loadOlder, onDisplayed, readError }: {
  messages: Message[]; scope: MessageScope; conversation: ConversationSummary; loadingOlder: boolean; hasOlder: boolean;
  loadOlder: () => Promise<void>; onDisplayed: (ids: string[]) => void; readError: string | null;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const previous = useRef<{ first: string | null; height: number; top: number }>({ first: null, height: 0, top: 0 });
  const visible = useRef(new Set<string>());
  const acknowledgeVisible = useCallback(() => {
    if (document.visibilityState === 'visible') onDisplayed([...visible.current]);
  }, [onDisplayed]);
  useLayoutEffect(() => {
    const node = viewport.current; if (!node) return;
    const first = messages[0]?.id ?? null;
    const prepended = previous.current.first && first !== previous.current.first && messages.some(row => row.id === previous.current.first);
    if (prepended) node.scrollTop = previous.current.top + node.scrollHeight - previous.current.height;
    else if (nearBottom.current) node.scrollTop = node.scrollHeight;
    previous.current = { first, height: node.scrollHeight, top: node.scrollTop };
  }, [messages]);
  useEffect(() => {
    const node = viewport.current; if (!node) return;
    visible.current.clear();
    if (typeof IntersectionObserver === 'undefined') return; // Never acknowledge without visibility evidence.
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const id = (entry.target as HTMLElement).dataset.messageId;
        if (!id) return;
        if (entry.isIntersecting && entry.intersectionRect.height > 0) visible.current.add(id); else visible.current.delete(id);
      });
      acknowledgeVisible();
    }, { root: node, threshold: [0, 0.1, 0.5, 1] });
    node.querySelectorAll('[data-incoming-unread="true"]').forEach(element => observer.observe(element));
    document.addEventListener('visibilitychange', acknowledgeVisible);
    return () => { observer.disconnect(); visible.current.clear(); document.removeEventListener('visibilitychange', acknowledgeVisible); };
  }, [messages, acknowledgeVisible]);
  const onScroll = () => {
    const node = viewport.current; if (!node) return;
    nearBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
    previous.current = { ...previous.current, height: node.scrollHeight, top: node.scrollTop };
  };
  const imageLoaded = () => { const node = viewport.current; if (node && nearBottom.current) node.scrollTop = node.scrollHeight; if (node) previous.current = { ...previous.current, height: node.scrollHeight, top: node.scrollTop }; };
  return <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
    {readError && <div role="alert" className="px-4 py-2 text-sm text-amber-200"><p>{readError}</p><Button size="sm" variant="outline" onClick={acknowledgeVisible}>Retry read status</Button></div>}
    <div ref={viewport} role="log" aria-label="Conversation messages" aria-live="off" className="flex-1 min-h-0 px-4 overflow-y-auto pb-4" onScroll={onScroll}>
      {hasOlder && <div className="py-2 flex justify-center"><Button variant="outline" size="sm" onClick={() => void loadOlder()} disabled={loadingOlder} className="bg-navy hover:bg-light-navy text-white border-light-navy">{loadingOlder ? 'Loading…' : 'Load older messages'}</Button></div>}
      <div className="space-y-4">
        {!messages.length ? <div className="flex items-center justify-center h-40"><p className="text-gray-400">{conversation.canSend ? 'No messages yet. Send the first one!' : 'No messages in this retained conversation.'}</p></div> : messages.map(message => <MessageItem key={message.id} message={message} scope={scope} conversation={conversation} onImageLoad={imageLoaded} />)}
      </div>
    </div>
  </div>;
}
