import React, { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { prepareIdentityCacheScope } from '@/data/indexedDB/useIndexedDB';
import { emptyIdentity, identityCacheScope, identityScopeUserIds, type IdentityState } from '@/lib/identity';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ProfileRole } from '@/types/profile';
import { supabaseBackendId } from '@/integrations/supabase/client';
import { forgetAccountRecovery, reconcileRecoveryAccount, recoveryAccess, subscribeRecovery } from '@/lib/offline/recovery';
import { OfflineRecovery } from '@/components/offline/OfflineRecovery';

interface UserIdsContextType extends IdentityState {
  isLoadingUserIds: boolean;
  initializeUserIds: () => Promise<void>;
}

const UserIdsContext = createContext<UserIdsContextType | undefined>(undefined);
const publicAccountPaths = new Set(['/auth', '/forgot-password', '/reset-password']);

export const UserIdsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { user, loading: authLoading, relationshipIdentity, refreshIdentity, signOut, updateUserRole, unlinkFromPartner } = useAuth();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const accountId = user?.id ?? null;
  const generation = useRef(0);
  const currentAccount = useRef(accountId);
  const lastPrepared = useRef<{ accountId: string | null; scope: string | null } | null>(null);
  currentAccount.current = accountId;
  const [preparedScope, setPreparedScope] = useState<string | null>(null);
  const [cacheError, setCacheError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  const identity = relationshipIdentity.currentUserId === accountId
    ? relationshipIdentity : emptyIdentity(accountId ? 'loading' : 'signed-out', accountId);
  const scope = identityCacheScope(identity);
  const repairScope = JSON.stringify([accountId, identity.relationshipId, identity.relationshipSessionId]);
  const currentRepairScope = useRef(repairScope); currentRepairScope.current = repairScope;
  const subUserId = identity.subUserId;
  const domUserId = identity.domUserId;
  const recovery = useSyncExternalStore(subscribeRecovery, () => accountId ? recoveryAccess(supabaseBackendId, accountId) : 'checking');
  useEffect(() => {
    if (!authLoading) reconcileRecoveryAccount(supabaseBackendId, accountId);
  }, [accountId, authLoading]);

  useEffect(() => {
    let active = true;
    const requestGeneration = ++generation.current;
    const isCurrent = () => active && currentAccount.current === accountId && generation.current === requestGeneration;
    setPreparedScope(null);
    setCacheError(null);
    setActionError(null);
    setIsRepairing(false);
    void prepareIdentityCacheScope(null, []);
    const prepare = async () => {
      try {
        await queryClient.cancelQueries();
        if (!isCurrent()) return;
        if (lastPrepared.current && lastPrepared.current.accountId !== accountId) {
          // Preserve the existing query-only account-switch fence. Ordinary identity refresh
          // must not discard paused mutations or offline work for this account.
          queryClient.removeQueries();
        } else if (scope && lastPrepared.current?.scope !== scope) {
          queryClient.removeQueries();
        }
        await prepareIdentityCacheScope(scope && accountId ? { backendId: supabaseBackendId, accountId, relationshipId: identity.relationshipId, relationshipSessionId: identity.relationshipSessionId } : null, scope ? identityScopeUserIds(subUserId, domUserId) : []);
        if (isCurrent()) {
          lastPrepared.current = { accountId, scope: scope ?? (lastPrepared.current?.accountId === accountId ? lastPrepared.current.scope : null) };
          setPreparedScope(scope);
        }
      } catch (error) {
        if (!isCurrent()) return;
        logger.error('Account cache preparation failed:', getErrorMessage(error));
        setCacheError('Your account data could not be prepared safely. Retry before continuing.');
      }
    };
    void prepare();
    return () => { active = false; };
  }, [accountId, scope, repairScope, subUserId, domUserId, queryClient, identity.relationshipId, identity.relationshipSessionId]);

  const initializeUserIds = useCallback(async () => {
    setCacheError(null);
    setActionError(null);
    await refreshIdentity();
  }, [refreshIdentity]);

  const effectiveIdentity = cacheError
    ? emptyIdentity('error', accountId, cacheError)
    : identity.canAccessData && preparedScope !== scope
      ? emptyIdentity('loading', accountId)
      : identity;
  const isLoadingUserIds = authLoading || effectiveIdentity.status === 'loading';
  const value = { ...effectiveIdentity, isLoadingUserIds, initializeUserIds };

  const repair = async (operation: () => Promise<unknown>) => {
    const expectedScope = repairScope;
    setIsRepairing(true);
    setActionError(null);
    try { await operation(); }
    catch (error) {
      if (currentRepairScope.current === expectedScope) setActionError(getErrorMessage(error));
    } finally {
      if (currentRepairScope.current === expectedScope) setIsRepairing(false);
    }
  };
  const needsBoundary = !!accountId && (!effectiveIdentity.canAccessData || isLoadingUserIds);
  const signOutAndRemoveRecovery = async () => { if (accountId) forgetAccountRecovery(supabaseBackendId, accountId); await signOut(); };
  const canSetRole = identity.status === 'invalid' && !identity.partnerUserId &&
    (identity.problem === 'missing_profile' || identity.problem === 'invalid_role');

  return (
    <UserIdsContext.Provider value={value}>
      {needsBoundary && !publicAccountPaths.has(pathname) ? (
        !authLoading && recovery === 'unreachable' && !cacheError ? <OfflineRecovery key={accountId} backendId={supabaseBackendId} accountId={accountId}
          checking={isLoadingUserIds} onRetry={() => void repair(initializeUserIds)} onSignOut={() => void repair(signOutAndRemoveRecovery)} /> :
        <main className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
          <section className="w-full max-w-md p-6 space-y-6 bg-card rounded-lg shadow-lg border border-border" aria-labelledby="identity-heading">
            <h1 id="identity-heading" className="text-2xl font-bold text-center text-foreground">{isLoadingUserIds ? 'Loading your account' : canSetRole ? 'Set up your role' : 'Account connection needs attention'}</h1>
            <p role={isLoadingUserIds ? 'status' : 'alert'} className="text-sm text-muted-foreground">
              {isLoadingUserIds ? 'Checking your profile and partner connection…' : effectiveIdentity.error}
            </p>
            {actionError && <p role="alert" className="text-red-400 text-sm py-2 px-3 bg-red-900/30 border border-red-900 rounded">{actionError}</p>}
            {canSetRole && <div className="flex gap-3">
              {(['dom', 'sub'] as ProfileRole[]).map(role => <Button key={role} disabled={isRepairing} onClick={() => void repair(() => updateUserRole(role))} className="bg-primary hover:bg-primary/90">{role === 'dom' ? 'Choose Dom' : 'Choose Sub'}</Button>)}
            </div>}
            {identity.status === 'invalid' && identity.partnerUserId && <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{identity.lifecycleReady ? 'Disconnect this connection before choosing your role or connecting again. Your existing history will be kept.' : 'Partner changes are temporarily unavailable. Retry loading your account, or use password recovery.'}</p>
              <Button disabled={isRepairing || !identity.lifecycleReady || !identity.relationshipSessionId} variant="outline" className="border-red-500 text-red-300" onClick={() => void repair(unlinkFromPartner)}>Disconnect partner</Button>
            </div>}
            {!isLoadingUserIds && <div className="flex gap-3">
              <Button disabled={isRepairing} onClick={() => void repair(initializeUserIds)}>Retry</Button>
              <Button disabled={isRepairing} variant="outline" onClick={() => void repair(signOutAndRemoveRecovery)}>Sign out</Button>
            </div>}
          </section>
        </main>
      ) : children}
    </UserIdsContext.Provider>
  );
};

export const useUserIds = (): UserIdsContextType => {
  const context = useContext(UserIdsContext);
  if (!context) throw new Error('useUserIds must be used within a UserIdsProvider');
  return context;
};
