import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { MessageDraftSession, messageDraftRepository } from '@/data/messages/drafts';
import { messageTransport } from '@/data/messages/transport';
import type { MessageScope } from '@/data/messages/types';

export function useMessageDraft(scope: MessageScope, conversationId: string, confirmed: () => void) {
  const session = useMemo(() => new MessageDraftSession(scope, conversationId, messageDraftRepository(), messageTransport, confirmed), [scope, conversationId, confirmed]);
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  useEffect(() => { void session.load(); }, [session]);
  return { ...state, session };
}
