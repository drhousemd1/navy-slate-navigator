import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { prepareIdentityCacheScope } from '@/data/indexedDB/useIndexedDB';
import { emptyIdentity, identityCacheScope, identityScopeUserIds, type IdentityState } from '@/lib/identity';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ProfileRole } from '@/types/profile';

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
  const subUserId = identity.subUserId;
  const domUserId = identity.domUserId;

  useEffect(() => {
    let active = true;
    const requestGeneration = ++generation.current;
    const isCurrent = () => active && currentAccount.current === accountId && generation.current === requestGeneration;
    setPreparedScope(null);
    setCacheError(null);
    setActionError(null);
    setIsRepairing(false);
    const prepare = async () => {
      try {
        await queryClient.cancelQueries();
        if (!isCurrent()) return;
        if (lastPrepared.current && lastPrepared.current.accountId !== accountId) {
          // Preserve the existing account-switch reset. Ordinary identity refresh
          // must not discard paused mutations or offline work for this account.
          queryClient.clear();
        } else if (scope && lastPrepared.current?.scope !== scope) {
          queryClient.removeQueries();
        }
        await prepareIdentityCacheScope(scope, scope ? identityScopeUserIds(subUserId, domUserId) : []);
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
  }, [accountId, scope, subUserId, domUserId, queryClient]);

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
    const expectedAccount = accountId;
    setIsRepairing(true);
    setActionError(null);
    try { await operation(); }
    catch (error) {
      if (currentAccount.current === expectedAccount) setActionError(getErrorMessage(error));
    } finally {
      if (currentAccount.current === expectedAccount) setIsRepairing(false);
    }
  };
  const needsBoundary = !!accountId && (!effectiveIdentity.canAccessData || isLoadingUserIds);
  const canSetRole = identity.status === 'invalid' && !identity.partnerUserId &&
    (identity.problem === 'missing_profile' || identity.problem === 'invalid_role');

  return (
    <UserIdsContext.Provider value={value}>
      {needsBoundary && !publicAccountPaths.has(pathname) ? (
        <main className="flex h-full min-h-0 items-center justify-center overflow-y-auto bg-dark-navy p-6 text-white">
          <section className="w-full max-w-md rounded-lg border border-light-navy bg-navy p-6 space-y-4" aria-labelledby="identity-heading">
            <h1 id="identity-heading" className="text-xl font-semibold">{isLoadingUserIds ? 'Loading your account' : canSetRole ? 'Set up your role' : 'Account connection needs attention'}</h1>
            <p role={isLoadingUserIds ? 'status' : 'alert'} className="text-sm text-gray-300">
              {isLoadingUserIds ? 'Checking your profile and partner connection…' : effectiveIdentity.error}
            </p>
            {actionError && <p role="alert" className="text-sm text-red-300">{actionError}</p>}
            {canSetRole && <div className="flex gap-3">
              {(['dom', 'sub'] as ProfileRole[]).map(role => <Button key={role} disabled={isRepairing} onClick={() => void repair(() => updateUserRole(role))} className="bg-cyan-600 hover:bg-cyan-700">{role === 'dom' ? 'Choose Dom' : 'Choose Sub'}</Button>)}
            </div>}
            {identity.status === 'invalid' && identity.partnerUserId && <div className="space-y-2">
              <p className="text-sm text-gray-300">{identity.lifecycleReady ? 'Disconnect the invalid connection before repairing your role or connecting again. Existing history is archived by the account service.' : 'This connection needs repair. Partner changes are temporarily unavailable until the relationship history and privacy upgrade is ready. You can retry loading your account, or still use password recovery.'}</p>
              <Button disabled={isRepairing || !identity.lifecycleReady} variant="outline" className="border-red-500 text-red-300" onClick={() => void repair(unlinkFromPartner)}>Disconnect partner</Button>
            </div>}
            {!isLoadingUserIds && <div className="flex gap-3">
              <Button disabled={isRepairing} onClick={() => void repair(initializeUserIds)}>Retry</Button>
              <Button disabled={isRepairing} variant="outline" onClick={() => void repair(signOut)}>Sign out</Button>
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
