import React, { useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { useMessages } from '@/hooks/useMessages';
import { Button } from '@/components/ui/button';
import MessageList from '@/components/messages/MessageList';
import MessageComposer from '@/components/messages/MessageComposer';
import EarlierMessageDrafts from '@/components/messages/EarlierMessageDrafts';
import { messageScopeKey } from '@/data/messages/types';
import { useAuth } from '@/contexts/auth';

export default function Messages() {
  const { getNickname } = useAuth();
  const { scope, state, conversation, conversationId, selectConversation, acknowledge, loadOlder, refresh, page } = useMessages();
  const confirmed = useCallback(() => { void refresh?.(); }, [refresh]);
  const scopeKey = scope ? messageScopeKey(scope) : 'unavailable';
  return <AppLayout>
    <div key={scopeKey} className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="bg-navy border-b border-light-navy py-4 px-4">
        <h1 className={`text-xl font-semibold text-white`}>Messages</h1>
        <p className={`text-gray-400 text-sm`}>Chat with your partner</p>
        {(state.list?.conversations.length ?? 0) > 1 && <div className="mt-2"><label htmlFor="conversation-select" className={`text-sm text-gray-300`}>Conversation</label>
          <select id="conversation-select" className={`block w-full mt-1 rounded border border-light-navy bg-dark-navy p-2 text-white`} value={conversationId ?? ''} onChange={event => selectConversation(event.target.value)}>
            <option value="" disabled>Choose a retained conversation</option>
            {state.list.conversations.map(row => <option key={row.id} value={row.id}>{row.label}{row.state === 'archived' ? ` · retained ${new Date(row.startedAt).toLocaleDateString()}` : ' · current'}{row.unreadCount ? ` · ${row.unreadCount} unread` : ''}</option>)}
          </select>
        </div>}
        {state.list?.conversations.length === 1 && !state.list.currentConversationId && !conversationId && <Button className="mt-2" variant="outline" onClick={() => selectConversation(state.list!.conversations[0].id)}>View retained conversation</Button>}
      </div>
      {scope && <EarlierMessageDrafts key={scopeKey} scope={scope} />}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {(!scope || state.loading && !conversation) && <div role="status" className="flex items-center justify-center h-full"><p className="text-gray-400">{scope ? 'Loading messages...' : 'Checking your account connection…'}</p></div>}
      {(state.error || page?.error) && <div role="alert" className={page?.loaded ? 'px-4 py-2 space-y-2' : 'flex flex-col items-center justify-center h-full gap-4'}><p className="text-red-400">{state.error || page?.error}</p><Button variant="outline" onClick={() => void refresh?.()}>Retry messages</Button></div>}
      {conversation && scope ? <>
        {!conversation.canSend && <div className={`px-4 py-2 text-sm text-gray-300 bg-navy`}><p>This retained conversation is read-only.</p>{conversation.kind !== 'legacy_self' && <p>Names and avatars are hidden. Message text and images may still identify people.</p>}</div>}
        {!page?.loaded && !page?.error ? <div role="status" className="flex items-center justify-center h-full"><p className="text-gray-400">Loading messages...</p></div> : page?.loaded && <MessageList key={`${scopeKey}:${conversation.id}`} messages={page?.messages ?? []} scope={scope} conversation={conversation} ownNickname={getNickname()} loadingOlder={page?.loadingOlder ?? false} hasOlder={!!page?.cursor} loadOlder={loadOlder} onDisplayed={acknowledge} readError={page?.readError ?? null} />}
      </> : !state.loading && !state.error && scope && <p className={`p-4 text-gray-300`}>{state.list?.conversations.length ? 'Choose a retained conversation to read it.' : 'Connect with your partner in Profile to start a conversation.'}</p>}
      </div>
      {conversation && scope && <MessageComposer key={`draft:${scopeKey}:${conversation.id}`} scope={scope} conversationId={conversation.id} canSend={conversation.canSend && !state.error && !page?.error} confirmed={confirmed} />}
    </div>
  </AppLayout>;
}
