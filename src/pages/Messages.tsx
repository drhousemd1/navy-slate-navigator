import { useColorScheme } from '@/contexts/ColorSchemeContext';
import React, { useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { useMessages } from '@/hooks/useMessages';
import { Button } from '@/components/ui/button';
import MessageList from '@/components/messages/MessageList';
import MessageComposer from '@/components/messages/MessageComposer';
import EarlierMessageDrafts from '@/components/messages/EarlierMessageDrafts';
import { messageScopeKey } from '@/data/messages/types';

export default function Messages() {
  const isLightScheme = useColorScheme().currentScheme === 'light-turquoise';
  const { scope, state, conversation, conversationId, selectConversation, acknowledge, loadOlder, refresh, page } = useMessages();
  const confirmed = useCallback(() => { void refresh?.(); }, [refresh]);
  const scopeKey = scope ? messageScopeKey(scope) : 'unavailable';
  return <AppLayout>
    <div key={scopeKey} className="h-[calc(100dvh-8rem)] min-h-0 flex flex-col">
      <div className="bg-navy border-b border-light-navy py-4 px-4">
        <h1 className={`text-xl font-semibold ${isLightScheme ? 'text-foreground' : 'text-white'}`}>Messages</h1>
        <p className={`${isLightScheme ? 'text-foreground' : 'text-gray-400'} text-sm`}>Chat with your partner</p>
        {!!state.list?.conversations.length && <div className="mt-2"><label htmlFor="conversation-select" className={`text-sm ${isLightScheme ? 'text-foreground' : 'text-gray-300'}`}>Conversation</label>
          <select id="conversation-select" className={`block w-full mt-1 rounded border border-light-navy bg-dark-navy p-2 ${isLightScheme ? 'text-foreground' : 'text-white'}`} value={conversationId ?? ''} onChange={event => selectConversation(event.target.value)}>
            <option value="" disabled>Choose a retained conversation</option>
            {state.list.conversations.map(row => <option key={row.id} value={row.id}>{row.label}{row.state === 'archived' ? ` · retained ${new Date(row.startedAt).toLocaleDateString()}` : ' · current'}{row.unreadCount ? ` · ${row.unreadCount} unread` : ''}</option>)}
          </select>
        </div>}
      </div>
      {scope && <EarlierMessageDrafts key={scopeKey} scope={scope} />}
      {!scope && <p role="status" className={`p-4 ${isLightScheme ? 'text-foreground' : 'text-gray-300'}`}>Checking your account connection…</p>}
      {state.loading && <p role="status" className={`p-4 ${isLightScheme ? 'text-foreground' : 'text-gray-300'}`}>Loading conversations…</p>}
      {(state.error || page?.error) && <div role="alert" className={`p-4 ${isLightScheme ? 'text-red-700' : 'text-red-300'}`}><p>{state.error || page?.error}</p><Button variant="outline" onClick={() => void refresh?.()}>Retry messages</Button></div>}
      {conversation && scope ? <>
        {!conversation.canSend && <div className={`px-4 py-2 text-sm ${isLightScheme ? 'text-foreground' : 'text-gray-300'} bg-navy`}><p>This retained conversation is read-only.</p>{conversation.kind !== 'legacy_self' && <p>Names and avatars are hidden. Message text and images may still identify people.</p>}</div>}
        {!page?.loaded && !page?.error && <p role="status" className={`p-4 ${isLightScheme ? 'text-foreground' : 'text-gray-300'}`}>Loading messages…</p>}
        <MessageList key={`${scopeKey}:${conversation.id}`} messages={page?.messages ?? []} scope={scope} conversation={conversation} loadingOlder={page?.loadingOlder ?? false} hasOlder={!!page?.cursor} loadOlder={loadOlder} onDisplayed={acknowledge} readError={page?.readError ?? null} />
        <MessageComposer key={`draft:${scopeKey}:${conversation.id}`} scope={scope} conversationId={conversation.id} canSend={conversation.canSend && !state.error && !page?.error} confirmed={confirmed} />
      </> : !state.loading && !state.error && scope && <p className={`p-4 ${isLightScheme ? 'text-foreground' : 'text-gray-300'}`}>{state.list?.conversations.length ? 'Choose a retained conversation to read it.' : 'Connect with your partner in Profile to start a conversation.'}</p>}
    </div>
  </AppLayout>;
}
