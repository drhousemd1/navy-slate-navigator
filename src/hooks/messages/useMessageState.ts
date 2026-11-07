import { useMemo, useSyncExternalStore } from 'react';
import { useUserIds } from '@/contexts/UserIdsContext';
import { supabaseBackendId } from '@/integrations/supabase/client';
import { isRelationshipSessionId } from '@/lib/identity';
import { getMessageStore, type MessagingState } from '@/data/messages/store';
import type { MessageScope } from '@/data/messages/types';

const unavailable: MessagingState = { list: null, loading: false, error: null, conversations: {} };
const noSubscribe = () => () => {};
const emptySnapshot = () => unavailable;
export function useMessageState() {
  const identity = useUserIds();
  const scope = useMemo<MessageScope | null>(() => identity.canAccessData && !identity.isLoadingUserIds && identity.currentUserId && identity.relationshipId && isRelationshipSessionId(identity.relationshipSessionId)
    ? { backendId: supabaseBackendId, accountId: identity.currentUserId, relationshipId: identity.relationshipId, relationshipSessionId: identity.relationshipSessionId } : null,
  [identity.canAccessData, identity.isLoadingUserIds, identity.currentUserId, identity.relationshipId, identity.relationshipSessionId]);
  const store = useMemo(() => scope ? getMessageStore(scope) : null, [scope]);
  const state = useSyncExternalStore(store?.subscribe ?? noSubscribe, store?.getSnapshot ?? emptySnapshot, emptySnapshot);
  return { scope, store, state };
}
