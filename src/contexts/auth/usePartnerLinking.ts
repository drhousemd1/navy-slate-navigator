import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { callIdentityCommand, fetchIdentity, fetchLinkPreview, fetchPartnerLinkOptions, identityCommandError } from '@/data/identity';
import { decodeIdentity, emptyIdentity, getBrowserTimezone, isRelationshipSessionId, type IdentityState, type LinkPreview, type LinkMode, type PartnerLinkOptions, type PermissionChoice } from '@/lib/identity';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { toastManager } from '@/lib/toastManager';
import { supabaseBackendId } from '@/integrations/supabase/client';
import { clearRecoverySnapshot, isTransportUnavailable, recoveryAccess, setRecoveryAccess, verifyRecoveryScope } from '@/lib/offline/recovery';

export const usePartnerLinking = (user: User | null) => {
  const accountId = user?.id ?? null;
  const currentAccount = useRef(accountId);
  currentAccount.current = accountId;
  const generation = useRef(0);
  const commandGeneration = useRef(0);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const [identity, setIdentity] = useState<IdentityState>(() => emptyIdentity(accountId ? 'loading' : 'signed-out', accountId));
  const contextKey = JSON.stringify([accountId, identity.relationshipId, identity.relationshipSessionId]);
  const currentContext = useRef(contextKey); currentContext.current = contextKey;
  const [busyAccount, setBusyAccount] = useState<string | null>(null);
  const optionsRequest = useRef(0);
  const optionsController = useRef<AbortController | null>(null);
  const [optionsState, setOptionsState] = useState<{ scope: string; data: PartnerLinkOptions | null; loading: boolean; error: string | null } | null>(null);
  const [operationError, setOperationError] = useState<{ scope: string; message: string } | null>(null);

  const refreshIdentity = useCallback(async (): Promise<IdentityState | null> => {
    if (!mounted.current || currentAccount.current !== accountId) return null;
    const requestGeneration = ++generation.current;
    request.current?.abort();
    const controller = new AbortController();
    let timedOut = false;
    let rejectTimeout: (error: Error) => void;
    const timeoutResult = new Promise<never>((_, reject) => { rejectTimeout = reject; });
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); rejectTimeout(new Error('Identity connection timed out')); }, 12_000);
    request.current = controller;
    const isCurrent = () => mounted.current && currentAccount.current === accountId && generation.current === requestGeneration;
    if (!accountId) {
      clearTimeout(timeout);
      const signedOut = emptyIdentity('signed-out');
      if (isCurrent()) setIdentity(signedOut);
      return signedOut;
    }
    setIdentity(emptyIdentity('loading', accountId));
    // Preserve an already-visible frozen recovery screen during its retry.
    if (recoveryAccess(supabaseBackendId, accountId) !== 'unreachable') setRecoveryAccess(supabaseBackendId, accountId, 'checking');
    try {
      let next = await Promise.race([fetchIdentity(accountId, controller.signal), timeoutResult]);
      if (!isCurrent()) return null;
      if (next.canAccessData && next.timezone === null) {
        try {
          const timezone = getBrowserTimezone();
          if (!timezone) throw new Error('Browser timezone unavailable');
          // The server compares NULL under its identity lock. A simultaneous
          // login or explicit save may win; always keep the returned saved value.
          const receipt = await Promise.race([callIdentityCommand(accountId, 'initialize_my_timezone', { p_timezone: timezone }), timeoutResult]);
          if (!isCurrent()) return null;
          const initialized = decodeIdentity(accountId, receipt);
          if (!initialized.timezone) throw new Error('Timezone initialization was not confirmed');
          next = initialized;
        } catch {
          if (!isCurrent()) return null;
          next = { ...next, timezoneInitializationError: 'Your default timezone could not be saved. Choose and save your timezone in Profile, or retry loading your account.' };
        }
      }
      if (next.canAccessData && next.relationshipStatus === 'active' && next.relationshipId && next.participantId && isRelationshipSessionId(next.relationshipSessionId)) {
        verifyRecoveryScope({ backendId: supabaseBackendId, accountId, relationshipId: next.relationshipId, participantId: next.participantId, relationshipSessionId: next.relationshipSessionId });
      } else {
        clearRecoverySnapshot(supabaseBackendId);
        setRecoveryAccess(supabaseBackendId, accountId, 'denied');
      }
      setIdentity(next);
      return next;
    } catch (error) {
      if (!isCurrent() || (controller.signal.aborted && !timedOut)) return null;
      setRecoveryAccess(supabaseBackendId, accountId, timedOut || isTransportUnavailable(error) ? 'unreachable' : 'denied');
      logger.error('Account identity could not be loaded:', getErrorMessage(error));
      const failed = emptyIdentity('error', accountId, 'Your account and partner connection could not be loaded. Check your connection and try again.');
      setIdentity(failed);
      return failed;
    } finally { clearTimeout(timeout); }
  }, [accountId]);

  const cancelCurrentRequests = useCallback(() => {
    mounted.current = false;
    generation.current++;
    commandGeneration.current++;
    request.current?.abort();
    optionsRequest.current++;
    optionsController.current?.abort();
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refreshIdentity();
    return cancelCurrentRequests;
  }, [refreshIdentity, cancelCurrentRequests]);

  useEffect(() => {
    if (!accountId || identity.status !== 'error' || recoveryAccess(supabaseBackendId, accountId) !== 'unreachable') return;
    // A server outage need not change navigator.onLine. Poll only this failed
    // read, with a bounded cadence; never replay a mutation from here.
    const retry = () => { if (document.visibilityState !== 'hidden') void refreshIdentity(); };
    const interval = setInterval(retry, 15_000);
    window.addEventListener('online', retry);
    window.addEventListener('focus', retry);
    return () => { clearInterval(interval); window.removeEventListener('online', retry); window.removeEventListener('focus', retry); };
  }, [accountId, identity.status, refreshIdentity]);

  // Account changes must hide old getters in this render, before effects run.
  const relationshipIdentity = identity.currentUserId === accountId
    ? identity : emptyIdentity(accountId ? 'loading' : 'signed-out', accountId);

  const optionsCurrent = optionsState?.scope === contextKey && relationshipIdentity.status === 'unlinked';
  const partnerLinkOptions = optionsCurrent ? optionsState.data : null;
  const reloadPartnerLinkOptions = useCallback(async (): Promise<PartnerLinkOptions | null> => {
    const period = identity.relationshipId, session = identity.relationshipSessionId;
    if (!accountId || identity.currentUserId !== accountId || identity.status !== 'unlinked' || !period || !isRelationshipSessionId(session) ||
      !mounted.current || currentAccount.current !== accountId || currentContext.current !== contextKey) return null;
    const operation = ++optionsRequest.current, startingRead = generation.current;
    optionsController.current?.abort();
    const controller = new AbortController(); optionsController.current = controller;
    let timer: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => {
      controller.abort(); reject(new Error('Invitation choices could not be loaded. Check your connection and retry.'));
    }, 12_000); });
    const isCurrent = () => mounted.current && currentAccount.current === accountId && currentContext.current === contextKey &&
      generation.current === startingRead && optionsRequest.current === operation;
    setOptionsState({ scope: contextKey, data: null, loading: true, error: null });
    try {
      const next = await Promise.race([fetchPartnerLinkOptions(accountId, period, session, controller.signal), deadline]);
      if (!isCurrent()) return null;
      setOptionsState({ scope: contextKey, data: next, loading: false, error: null });
      return next;
    } catch (error) {
      if (isCurrent()) setOptionsState({ scope: contextKey, data: null, loading: false, error: identityCommandError(error) });
      return null;
    } finally { clearTimeout(timer!); }
  }, [accountId, contextKey, identity.currentUserId, identity.status, identity.relationshipId, identity.relationshipSessionId]);

  const runCommand = async (command: () => Promise<unknown>, successMessage?: string, failureTitle = 'Unable to update partner connection', showPartnerError = true): Promise<IdentityState | null> => {
    if (!accountId || !mounted.current || currentAccount.current !== accountId || currentContext.current !== contextKey) return null;
    const startingRead = generation.current;
    const operation = ++commandGeneration.current;
    const isCurrent = () => mounted.current && currentAccount.current === accountId && commandGeneration.current === operation;
    setBusyAccount(accountId);
    if (showPartnerError) setOperationError(null);
    try {
      await command();
      if (!isCurrent() || currentContext.current !== contextKey || generation.current !== startingRead) return null;
      const next = await refreshIdentity();
      if (!isCurrent()) return null;
      if (!next || !next.canAccessData) {
        if (showPartnerError) setOperationError({ scope: contextKey, message: 'The request completed, but the account status could not be refreshed. Retry before continuing.' });
        toastManager.error('Refresh needed', 'The request completed, but the account status could not be refreshed. Retry before continuing.');
        return null;
      }
      if (successMessage) toastManager.success('Success', successMessage);
      return next;
    } catch (error) {
      if (isCurrent() && currentContext.current === contextKey && generation.current === startingRead) {
        logger.error('Partner request failed:', getErrorMessage(error));
        if (showPartnerError) setOperationError({ scope: contextKey, message: identityCommandError(error) });
        toastManager.error(failureTitle, identityCommandError(error));
      }
      return null;
    } finally {
      if (isCurrent()) setBusyAccount(null);
    }
  };

  const generateLinkCode = async (mode: LinkMode = 'fresh', previousRelationshipId: string | null = null): Promise<string | null> => {
    const expectedPeriod = relationshipIdentity.relationshipId;
    const expectedSession = relationshipIdentity.relationshipSessionId;
    if (!expectedPeriod || !isRelationshipSessionId(expectedSession) || !accountId || !mounted.current ||
      currentAccount.current !== accountId || currentContext.current !== contextKey || !partnerLinkOptions ||
      (mode === 'fresh' ? !partnerLinkOptions.canGenerateFresh || previousRelationshipId !== null
        : !partnerLinkOptions.archivedRelationships.some(row => row.relationshipId === previousRelationshipId && row.canGenerateContinue))) return null;
    const operation = ++commandGeneration.current, startingRead = generation.current;
    const isCurrent = () => mounted.current && currentAccount.current === accountId && currentContext.current === contextKey &&
      commandGeneration.current === operation && generation.current === startingRead;
    setBusyAccount(accountId);
    setOperationError(null);
    // Replacement may succeed even if its response is lost. Never keep offering
    // the previous code as though it were still verified after that uncertainty.
    optionsRequest.current++; optionsController.current?.abort();
    setOptionsState({ scope: contextKey, data: null, loading: true, error: null });
    let timer: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => {
      reject(new Error('Could not confirm invitation generation. Reload invitation choices before sharing a code. The request will not be sent again automatically.'));
    }, 12_000); });
    try {
      // A timeout does not mean the server rolled back. Stop waiting, retain the
      // uncertainty, and ignore a later response; recovery only reads metadata.
      const receipt = await Promise.race([callIdentityCommand(accountId, 'generate_partner_link_code', {
        p_expected_relationship_id: expectedPeriod, p_expected_relationship_session_id: expectedSession, p_mode: mode, p_previous_relationship_id: previousRelationshipId,
      }), deadline]);
      clearTimeout(timer!);
      if (!isCurrent()) return null;
      const next = await reloadPartnerLinkOptions();
      if (!isCurrent() || !next) return null;
      const code = receipt && typeof receipt === 'object' && 'code' in receipt ? receipt.code : null;
      if (next.invitation?.code !== code || next.invitation.mode !== mode || next.invitation.previousRelationshipId !== previousRelationshipId) {
        throw new Error('The invitation changed. Review the current invitation before sharing it.');
      }
      return next.invitation.code;
    } catch (error) {
      if (isCurrent()) setOptionsState({ scope: contextKey, data: null, loading: false, error: identityCommandError(error) });
      return null;
    } finally {
      clearTimeout(timer!);
      if (mounted.current && currentAccount.current === accountId && commandGeneration.current === operation) setBusyAccount(null);
    }
  };

  const previewPartnerCode = async (code: string): Promise<LinkPreview | null> => {
    if (!accountId || currentAccount.current !== accountId || !mounted.current || currentContext.current !== contextKey || !isRelationshipSessionId(relationshipIdentity.relationshipSessionId)) return null;
    const operation = ++commandGeneration.current;
    const startingRead = generation.current;
    const isCurrent = () => mounted.current && currentAccount.current === accountId && commandGeneration.current === operation;
    setBusyAccount(accountId);
    setOperationError(null);
    try {
      const preview = await fetchLinkPreview(accountId, code);
      return isCurrent() && currentContext.current === contextKey && generation.current === startingRead ? preview : null;
    } catch (error) {
      if (isCurrent() && currentContext.current === contextKey && generation.current === startingRead) {
        setOperationError({ scope: contextKey, message: identityCommandError(error) });
        toastManager.error('Unable to review connection', identityCommandError(error));
      }
      return null;
    } finally {
      if (isCurrent()) setBusyAccount(null);
    }
  };

  const linkToPartner = async (partnerCode: string, consent: LinkPreview): Promise<boolean> => {
    const expectedPeriod = relationshipIdentity.relationshipId;
    const expectedSession = relationshipIdentity.relationshipSessionId;
    if (!expectedPeriod || !isRelationshipSessionId(expectedSession)) return false;
    const next = await runCommand(() => callIdentityCommand(accountId, 'accept_partner_link_code', {
      p_expected_relationship_id: expectedPeriod, p_expected_relationship_session_id: expectedSession, p_code: partnerCode.trim().toUpperCase(), p_mode: consent.mode,
      p_previous_relationship_id: consent.previousRelationshipId,
    }), 'Connected to your partner.');
    return next?.status === 'linked';
  };

  const unlinkFromPartner = async (): Promise<boolean> => {
    // Capture the period the person reviewed. Never replace it after a conflict.
    const expectedPeriod = relationshipIdentity.relationshipId;
    const expectedSession = relationshipIdentity.relationshipSessionId;
    if (!expectedPeriod || !isRelationshipSessionId(expectedSession)) {
      if (mounted.current && currentAccount.current === accountId && currentContext.current === contextKey) {
        setOperationError({ scope: contextKey, message: 'Load your current relationship before disconnecting.' });
      }
      toastManager.error('Refresh needed', 'Load your current relationship before disconnecting.');
      return false;
    }
    const next = await runCommand(() => callIdentityCommand(accountId, 'unlink_my_partner', {
      p_expected_relationship_id: expectedPeriod, p_expected_relationship_session_id: expectedSession,
    }), 'Partner disconnected.');
    return next?.status === 'unlinked';
  };

  const updateRelationshipPermissions = async (permissions: Record<string, PermissionChoice>): Promise<boolean> => {
    const expectedPeriod = relationshipIdentity.relationshipId;
    const expectedSession = relationshipIdentity.relationshipSessionId;
    if (!expectedPeriod || !isRelationshipSessionId(expectedSession)) return false;
    const next = await runCommand(() => callIdentityCommand(accountId, 'set_relationship_permissions', {
      p_permissions: permissions, p_expected_relationship_id: expectedPeriod, p_expected_relationship_session_id: expectedSession,
    }), 'Relationship permissions updated.', 'Unable to update partner connection', false);
    return !!next?.canAccessData;
  };

  const updateTimezone = async (timezone: string): Promise<boolean> => {
    const next = await runCommand(() => callIdentityCommand(accountId, 'set_my_timezone', { p_timezone: timezone }), 'Timezone updated.', 'Unable to save timezone', false);
    return next?.timezone === timezone;
  };

  const getLinkedPartnerInfo = async (): Promise<{ id: string; role: 'sub' | 'dom'; email?: string } | null> => {
    if (currentAccount.current !== accountId || relationshipIdentity.status !== 'linked' || !relationshipIdentity.partnerUserId || !relationshipIdentity.partnerRole) return null;
    return { id: relationshipIdentity.partnerUserId, role: relationshipIdentity.partnerRole };
  };

  return {
    relationshipIdentity,
    partnerLinkOptions,
    partnerLinkOptionsLoading: optionsCurrent && optionsState.loading,
    partnerLinkOptionsError: optionsCurrent ? optionsState.error : null,
    partnerLinkingError: operationError?.scope === contextKey ? operationError.message : null,
    reloadPartnerLinkOptions,
    refreshIdentity,
    generateLinkCode,
    previewPartnerCode,
    updateRelationshipPermissions,
    updateTimezone,
    linkToPartner,
    unlinkFromPartner,
    getLinkedPartnerInfo,
    getCurrentLinkCode: (): string | null => currentAccount.current === accountId && currentContext.current === contextKey ? partnerLinkOptions?.invitation?.code ?? null : null,
    getLinkedPartnerId: (): string | null => currentAccount.current === accountId && relationshipIdentity.status === 'linked' ? relationshipIdentity.partnerUserId : null,
    loading: busyAccount === accountId && !!accountId,
    partnerLinkingAvailable: relationshipIdentity.lifecycleReady === true && isRelationshipSessionId(relationshipIdentity.relationshipSessionId),
  };
};
