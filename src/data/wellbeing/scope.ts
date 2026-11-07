import { useUserIds } from '@/contexts/UserIdsContext';
import { supabaseBackendId } from '@/integrations/supabase/client';
import type { WellbeingScope } from './types';

export const wellbeingScopeKey = (scope: WellbeingScope | null) => scope ? [scope.backendId, scope.accountId, scope.relationshipId, scope.relationshipSessionId] : [];
export function useWellbeingScope(): WellbeingScope | null {
  const identity = useUserIds();
  return identity.canAccessData && identity.currentUserId && identity.relationshipId && identity.relationshipSessionId ? {
    backendId: supabaseBackendId, accountId: identity.currentUserId, relationshipId: identity.relationshipId, relationshipSessionId: identity.relationshipSessionId,
  } : null;
}
