import { useMemo } from 'react';
import { useUserIds } from '@/contexts/UserIdsContext';
import { supabaseBackendId } from '@/integrations/supabase/client';
import type { EditorDraftScope } from '@/lib/editorDrafts';
import { isRelationshipSessionId } from '@/lib/identity';

export function useEditorDraftScope(): EditorDraftScope | null {
  const identity = useUserIds();
  return useMemo(() => identity.canAccessData && !identity.isLoadingUserIds && identity.currentUserId && identity.relationshipId && isRelationshipSessionId(identity.relationshipSessionId)
    ? { backendId: supabaseBackendId, accountId: identity.currentUserId, relationshipId: identity.relationshipId, relationshipSessionId: identity.relationshipSessionId } : null,
  [identity.canAccessData, identity.isLoadingUserIds, identity.currentUserId, identity.relationshipId, identity.relationshipSessionId]);
}
