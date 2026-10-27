import { useMemo } from 'react';
import { useUserIds } from '@/contexts/UserIdsContext';
import { supabaseBackendId } from '@/integrations/supabase/client';
import type { EditorDraftScope } from '@/lib/editorDrafts';

export function useEditorDraftScope(): EditorDraftScope | null {
  const identity = useUserIds();
  return useMemo(() => identity.canAccessData && !identity.isLoadingUserIds && identity.currentUserId && identity.relationshipId
    ? { backendId: supabaseBackendId, accountId: identity.currentUserId, relationshipId: identity.relationshipId } : null,
  [identity.canAccessData, identity.isLoadingUserIds, identity.currentUserId, identity.relationshipId]);
}
