import { useCallback, useEffect, useState } from 'react';
import { useMessageState } from './messages/useMessageState';
import { messageScopeKey } from '@/data/messages/types';
export type { Message } from '@/data/messages/types';

export function useMessages() {
  const { scope, store, state } = useMessageState();
  const key = scope ? messageScopeKey(scope) : null;
  const [selected, setSelected] = useState<{ key: string; id: string } | null>(null);
  const conversationId = selected?.key === key && state.list?.conversations.some(row => row.id === selected.id)
    ? selected.id : state.list?.currentConversationId ?? null;
  const conversation = state.list?.conversations.find(row => row.id === conversationId) ?? null;
  useEffect(() => conversationId && store ? store.watch(conversationId) : undefined, [store, conversationId]);
  const selectConversation = useCallback((id: string) => { if (key) setSelected({ key, id }); }, [key]);
  const acknowledge = useCallback((ids: string[]) => { if (store && conversationId) void store.acknowledge(conversationId, ids); }, [store, conversationId]);
  const loadOlder = useCallback(() => store && conversationId ? store.loadOlder(conversationId) : Promise.resolve(), [store, conversationId]);
  return { scope, state, conversation, conversationId, selectConversation, acknowledge, loadOlder, refresh: store?.refresh,
    page: conversationId ? state.conversations[conversationId] : null };
}
