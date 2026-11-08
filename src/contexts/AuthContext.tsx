
import React, { createContext, useState, useEffect, useContext, useRef, useCallback, ReactNode } from 'react';
import { Session, User, AuthChangeEvent, Subscription } from '@supabase/supabase-js';
import { supabase, supabaseBackendId, supabaseAuthStorageKey, clearDeletedAccountSession, signOutCurrentSession, synchronizeRealtimeSession } from '@/integrations/supabase/client';
import { forgetAccountRecovery } from '@/lib/offline/recovery';
import { revokeCurrentPushDeviceBeforeSignOut } from '@/lib/pushDevice';
import { toast } from '@/hooks/use-toast';
import { queryClient } from '@/data/queryClient';
import { invalidateAccountCacheScope } from '@/data/indexedDB/useIndexedDB';
import { ownsDeletionQuery } from '@/data/accountDeletion/cleanup';
import { sessionOwner, sameSessionOwner, storedSessionOwner, subscribeOwnedSignOut, type SessionOwner } from '@/lib/ownedSignOut';
import { useAuthOperations } from './auth/useAuthOperations';
import { useUserProfile } from './auth/useUserProfile';
import { useAccountDeletion } from './auth/useAccountDeletion';
import { isDeletedAccount } from '@/data/accountDeletion/tombstone';
import { AccountDeletionProgress } from '@/components/account/AccountDeletionProgress';
import { StandardLoading } from '@/components/common/StandardizedStates';
import { Button } from '@/components/ui/button';
import { useRoleTransitions } from './auth/useRoleTransitions';
import { usePartnerLinking } from './auth/usePartnerLinking';
import { logger } from '@/lib/logger';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  userExists: boolean;
  sessionExists: boolean;
}

export interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  signIn: ReturnType<typeof useAuthOperations>['signIn'];
  signUp: ReturnType<typeof useAuthOperations>['signUp'];
  resetPassword: ReturnType<typeof useAuthOperations>['resetPassword'];
  updatePassword: ReturnType<typeof useAuthOperations>['updatePassword'];
  accountDeletion: ReturnType<typeof useAccountDeletion>;
  getNickname: ReturnType<typeof useUserProfile>['getNickname'];
  getProfileImage: ReturnType<typeof useUserProfile>['getProfileImage'];
  getUserRole: ReturnType<typeof useUserProfile>['getUserRole'];
  getUserRoleSync: ReturnType<typeof useUserProfile>['getUserRoleSync']; // Add this line
  updateNickname: ReturnType<typeof useUserProfile>['updateNickname'];
  uploadProfileImageAndUpdateState: ReturnType<typeof useUserProfile>['uploadProfileImageAndUpdateState'];
  deleteUserProfileImage: ReturnType<typeof useUserProfile>['deleteUserProfileImage'];
  updateUserRole: ReturnType<typeof useUserProfile>['updateUserRole'];
  roleTransitions: ReturnType<typeof useRoleTransitions>;
  checkAdminStatus: () => Promise<boolean>;
  // Partner linking functions
  generateLinkCode: ReturnType<typeof usePartnerLinking>['generateLinkCode'];
  partnerLinkOptions: ReturnType<typeof usePartnerLinking>['partnerLinkOptions'];
  partnerLinkOptionsLoading: boolean;
  partnerLinkOptionsError: string | null;
  partnerLinkingError: string | null;
  reloadPartnerLinkOptions: ReturnType<typeof usePartnerLinking>['reloadPartnerLinkOptions'];
  previewPartnerCode: ReturnType<typeof usePartnerLinking>['previewPartnerCode'];
  updateRelationshipPermissions: ReturnType<typeof usePartnerLinking>['updateRelationshipPermissions'];
  updateTimezone: ReturnType<typeof usePartnerLinking>['updateTimezone'];
  linkToPartner: ReturnType<typeof usePartnerLinking>['linkToPartner'];
  unlinkFromPartner: ReturnType<typeof usePartnerLinking>['unlinkFromPartner'];
  getLinkedPartnerInfo: ReturnType<typeof usePartnerLinking>['getLinkedPartnerInfo'];
  getCurrentLinkCode: ReturnType<typeof usePartnerLinking>['getCurrentLinkCode'];
  getLinkedPartnerId: ReturnType<typeof usePartnerLinking>['getLinkedPartnerId'];
  partnerLinkingLoading: boolean;
  relationshipIdentity: ReturnType<typeof usePartnerLinking>['relationshipIdentity'];
  refreshIdentity: ReturnType<typeof usePartnerLinking>['refreshIdentity'];
  partnerLinkingAvailable: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    isAuthenticated: false,
    isAdmin: false,
    userExists: false,
    sessionExists: false,
  });

  const authOperations = useAuthOperations();
  const currentAccountId = useRef(authState.user?.id ?? null);
  const currentSession = useRef<Session | null>(null);
  const authGeneration = useRef(0);
  const endedSessions = useRef(new Set<string>());
  const wrappedSetUserForProfile = (updatedUser: User | null) => {
    const expectedAccountId = authState.user?.id;
    setAuthState(currentAuthState => {
      if (currentAuthState.user?.id !== expectedAccountId || (updatedUser && updatedUser.id !== expectedAccountId)) return currentAuthState;
      return { ...currentAuthState, user: updatedUser, userExists: !!updatedUser };
    });
  };
  const partnerLinkingUtils = usePartnerLinking(authState.user);
  const userProfileUtils = useUserProfile(authState.user, wrappedSetUserForProfile, {
    getRole: () => partnerLinkingUtils.relationshipIdentity.currentRole,
    refresh: partnerLinkingUtils.refreshIdentity,
  });
  const roleTransitions = useRoleTransitions(authState.user?.id ?? null, partnerLinkingUtils.relationshipIdentity, partnerLinkingUtils.refreshIdentity);

  const deletionAccounts = useRef(new Set<string>());
  const endDeletedSession = async (account: string) => {
    const result = await clearDeletedAccountSession(account);
    if (result === 'other_account' || currentAccountId.current !== account) return;
    currentAccountId.current = null; currentSession.current = null; authGeneration.current++;
    setAuthState({ user: null, session: null, loading: false, isAuthenticated: false, isAdmin: false, userExists: false, sessionExists: false });
  };
  const accountDeletion = useAccountDeletion(authState.user?.id ?? null, partnerLinkingUtils.relationshipIdentity, endDeletedSession);
  deletionAccounts.current = new Set(accountDeletion.records.filter(record => !record.startRejected).map(record => record.scope.accountId));

  // On-demand admin check function
  const checkAdminStatus = async (): Promise<boolean> => {
    if (!authState.user) return false;
    const requestedAccountId = authState.user.id;

    try {
      const { data: hasAdminRole, error } = await supabase.rpc('has_role', {
        requested_user_id: requestedAccountId,
        requested_role: 'admin'
      });

      if (error) {
        logger.error('Error checking admin role:', error);
        return false;
      }

      const isAdmin = !!hasAdminRole;
      if (currentAccountId.current !== requestedAccountId) return false;
      setAuthState(prev => prev.user?.id === requestedAccountId ? { ...prev, isAdmin } : prev);
      return isAdmin;
    } catch (e) {
      logger.error('Exception during admin role check:', e);
      return false;
    }
  };

  const clearDepartingView = useCallback((accountId: string) => {
    invalidateAccountCacheScope(supabaseBackendId, accountId);
    try { forgetAccountRecovery(supabaseBackendId, accountId); } catch (error) { logger.error('Account recovery display cleanup failed:', error); }
    const predicate = (query: { queryKey: readonly unknown[] }) => ownsDeletionQuery(query.queryKey, { backendId: supabaseBackendId, accountId });
    // No await followed by mutation of newer state. Pending command/draft stores
    // and unidentified disk bytes are intentionally untouched on ordinary logout.
    void queryClient.cancelQueries({ predicate }).catch(error => logger.error('Account query cancellation failed:', error));
    queryClient.removeQueries({ predicate });
  }, []);
  const endOwnedSession = useCallback((owner: SessionOwner | null) => {
    if (!owner || owner.backendId !== supabaseBackendId) return;
    endedSessions.current.add(JSON.stringify(owner));
    if (!sameSessionOwner(owner, sessionOwner(supabaseBackendId, currentSession.current))) return;
    currentSession.current = null; currentAccountId.current = null; authGeneration.current++;
    setAuthState({ user: null, session: null, loading: false, isAuthenticated: false, isAdmin: false, userExists: false, sessionExists: false });
    synchronizeRealtimeSession();
    if (!deletionAccounts.current.has(owner.accountId)) clearDepartingView(owner.accountId);
  }, [clearDepartingView]);
  useEffect(() => subscribeOwnedSignOut(supabaseBackendId, supabaseAuthStorageKey, endOwnedSession), [endOwnedSession]);

  useEffect(() => {
    logger.debug("AuthContext: Starting instant auth check...");
    let subscriptionCleanup: Subscription | null = null;

    const initializeAuth = async () => {
      try {
        // Set up auth state change listener first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event: AuthChangeEvent, newSession: Session | null) => {
            logger.debug(`AuthContext: Auth state change: ${event}`);

            if (newSession && (isDeletedAccount(supabaseBackendId, newSession.user.id) || endedSessions.current.has(JSON.stringify(sessionOwner(supabaseBackendId, newSession))))) return;
            // SDK broadcasts SIGNED_OUT without ownership. Ignore it if storage
            // already holds a different/newer valid login; our own logout uses a scoped event.
            if (!newSession && event === 'SIGNED_OUT' && storedSessionOwner(supabaseBackendId, supabaseAuthStorageKey, localStorage)) return;
            authGeneration.current++;
            currentSession.current = newSession;
            if (newSession) {
              currentAccountId.current = newSession.user.id;
              // User is authenticated - set state immediately
              setAuthState({
                user: newSession.user,
                session: newSession,
                loading: false,
                isAuthenticated: true,
                isAdmin: false, // Will be checked on-demand only
                userExists: true,
                sessionExists: true,
              });

              logger.debug("AuthContext: User authenticated, app ready");
            } else {
              const departingAccount = currentAccountId.current;
              if (event === 'SIGNED_OUT' && departingAccount && !deletionAccounts.current.has(departingAccount)) clearDepartingView(departingAccount);

              currentAccountId.current = null;
              setAuthState({
                user: null,
                session: null,
                loading: false,
                isAuthenticated: false,
                isAdmin: false,
                userExists: false,
                sessionExists: false,
              });

              logger.debug("AuthContext: User not authenticated");
            }
          }
        );

        subscriptionCleanup = subscription;

        // Check for existing session - this should be instant from localStorage
        const initialGeneration = authGeneration.current;
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        if (authGeneration.current !== initialGeneration) return;

        if (error) {
          logger.error("AuthContext: Error getting session:", error);
          setAuthState(prev => ({ ...prev, loading: false }));
          return;
        }

        if (existingSession && !isDeletedAccount(supabaseBackendId, existingSession.user.id) && !endedSessions.current.has(JSON.stringify(sessionOwner(supabaseBackendId, existingSession)))) {
          currentSession.current = existingSession; currentAccountId.current = existingSession.user.id;
          // User has existing session - set immediately
          setAuthState({
            user: existingSession.user,
            session: existingSession,
            loading: false,
            isAuthenticated: true,
            isAdmin: false, // Will be checked on-demand only
            userExists: true,
            sessionExists: true,
          });

          logger.debug("AuthContext: Existing session found, app ready");
        } else {
          // No session - stop loading immediately
          setAuthState(prev => ({ ...prev, loading: false }));
          logger.debug("AuthContext: No existing session, app ready");
        }

      } catch (e) {
        logger.error("AuthContext: Exception during initialization:", e);
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    };

    initializeAuth();

    return () => {
      logger.debug("AuthContext: Cleaning up auth subscription");
      subscriptionCleanup?.unsubscribe();
    };
  }, [clearDepartingView]);

  const reloadDeletion = accountDeletion.reload;
  useEffect(() => {
    const handleDeletion = () => {
      const account = currentAccountId.current;
      if (!account || !isDeletedAccount(supabaseBackendId, account)) return;
      currentAccountId.current = null; currentSession.current = null; authGeneration.current++;
      setAuthState({ user: null, session: null, loading: false, isAuthenticated: false, isAdmin: false, userExists: false, sessionExists: false });
      void reloadDeletion();
    };
    window.addEventListener('storage', handleDeletion);
    return () => window.removeEventListener('storage', handleDeletion);
  }, [reloadDeletion]);

  const signOut = async () => {
    const session = currentSession.current;
    if (!session) return;
    const owner = sessionOwner(supabaseBackendId, session);
    try {
      if (!owner) throw new Error('Session ownership could not be verified. Reload before signing out.');
      const pushResult = await revokeCurrentPushDeviceBeforeSignOut(session.user.id);
      // Includes same-account replacement logins, not just a change in user ID.
      if (!sameSessionOwner(owner, sessionOwner(supabaseBackendId, currentSession.current))) return;
      await signOutCurrentSession(session);
      // The owner-specific event clears the departed view; never clear a newer view.
      endOwnedSession(owner);
      if (pushResult === 'unconfirmed' && !currentSession.current) toast({ title: 'Device notifications not confirmed off', description: 'You are signed out. To stop all alerts on this browser, turn off this site’s notifications in browser settings.' });
    } catch (error) {
      logger.error('AuthContext: Error signing out:', error);
      if (currentSession.current === session || sameSessionOwner(owner, sessionOwner(supabaseBackendId, currentSession.current))) toast({ title: 'Sign Out Error', description: error instanceof Error ? error.message : 'Sign out needs another attempt.', variant: 'destructive' });
    }
  };

  const contextValue: AuthContextType = {
    ...authState,
    signOut,
    signIn: authOperations.signIn,
    signUp: authOperations.signUp,
    resetPassword: authOperations.resetPassword,
    updatePassword: authOperations.updatePassword,
    accountDeletion,
    getNickname: userProfileUtils.getNickname,
    getProfileImage: userProfileUtils.getProfileImage,
    getUserRole: userProfileUtils.getUserRole,
    getUserRoleSync: userProfileUtils.getUserRoleSync, // Add this line
    updateNickname: userProfileUtils.updateNickname,
    uploadProfileImageAndUpdateState: userProfileUtils.uploadProfileImageAndUpdateState,
    deleteUserProfileImage: userProfileUtils.deleteUserProfileImage,
    updateUserRole: userProfileUtils.updateUserRole,
    roleTransitions,
    checkAdminStatus,
    // Partner linking functions
    generateLinkCode: partnerLinkingUtils.generateLinkCode,
    partnerLinkOptions: partnerLinkingUtils.partnerLinkOptions,
    partnerLinkOptionsLoading: partnerLinkingUtils.partnerLinkOptionsLoading,
    partnerLinkOptionsError: partnerLinkingUtils.partnerLinkOptionsError,
    partnerLinkingError: partnerLinkingUtils.partnerLinkingError,
    reloadPartnerLinkOptions: partnerLinkingUtils.reloadPartnerLinkOptions,
    previewPartnerCode: partnerLinkingUtils.previewPartnerCode,
    updateRelationshipPermissions: partnerLinkingUtils.updateRelationshipPermissions,
    updateTimezone: partnerLinkingUtils.updateTimezone,
    linkToPartner: partnerLinkingUtils.linkToPartner,
    unlinkFromPartner: partnerLinkingUtils.unlinkFromPartner,
    getLinkedPartnerInfo: partnerLinkingUtils.getLinkedPartnerInfo,
    getCurrentLinkCode: partnerLinkingUtils.getCurrentLinkCode,
    getLinkedPartnerId: partnerLinkingUtils.getLinkedPartnerId,
    partnerLinkingLoading: partnerLinkingUtils.loading,
    relationshipIdentity: partnerLinkingUtils.relationshipIdentity,
    refreshIdentity: partnerLinkingUtils.refreshIdentity,
    partnerLinkingAvailable: partnerLinkingUtils.partnerLinkingAvailable,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {accountDeletion.loading ? <div role="status" aria-label="Checking saved account recovery"><StandardLoading /></div>
        : accountDeletion.loadError ? <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4"><div className="w-full max-w-md p-6 space-y-6 bg-card rounded-lg shadow-lg border border-border"><p role="alert" className="text-red-400 text-sm py-2 px-3 bg-red-900/30 border border-red-900 rounded">{accountDeletion.loadError}</p><Button className="w-full bg-primary hover:bg-primary/90" onClick={() => void accountDeletion.reload()}>Retry recovery check</Button></div></div>
          : accountDeletion.records.find(record => record.scope.accountId === authState.user?.id)
            ? <AccountDeletionProgress deletion={accountDeletion} record={accountDeletion.records.find(record => record.scope.accountId === authState.user?.id)!} />
            : children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
