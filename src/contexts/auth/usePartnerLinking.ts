import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { callIdentityCommand, fetchIdentity, fetchLinkPreview, identityCommandError } from '@/data/identity';
import { decodeIdentity, emptyIdentity, getBrowserTimezone, type IdentityState, type LinkPreview, type LinkMode, type PermissionChoice } from '@/lib/identity';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { toastManager } from '@/lib/toastManager';

export const usePartnerLinking = (user: User | null) => {
  const accountId = user?.id ?? null;
  const currentAccount = useRef(accountId);
  currentAccount.current = accountId;
  const generation = useRef(0);
  const commandGeneration = useRef(0);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const [identity, setIdentity] = useState<IdentityState>(() => emptyIdentity(accountId ? 'loading' : 'signed-out', accountId));
  const [busyAccount, setBusyAccount] = useState<string | null>(null);

  const refreshIdentity = useCallback(async (): Promise<IdentityState | null> => {
    if (!mounted.current || currentAccount.current !== accountId) return null;
    const requestGeneration = ++generation.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const isCurrent = () => mounted.current && currentAccount.current === accountId && generation.current === requestGeneration;
    if (!accountId) {
      const signedOut = emptyIdentity('signed-out');
      if (isCurrent()) setIdentity(signedOut);
      return signedOut;
    }
    setIdentity(emptyIdentity('loading', accountId));
    try {
      let next = await fetchIdentity(accountId, controller.signal);
      if (!isCurrent()) return null;
      if (next.canAccessData && next.timezone === null) {
        try {
          const timezone = getBrowserTimezone();
          if (!timezone) throw new Error('Browser timezone unavailable');
          // The server compares NULL under its identity lock. A simultaneous
          // login or explicit save may win; always keep the returned saved value.
          const receipt = await callIdentityCommand(accountId, 'initialize_my_timezone', { p_timezone: timezone });
          if (!isCurrent()) return null;
          const initialized = decodeIdentity(accountId, receipt);
          if (!initialized.timezone) throw new Error('Timezone initialization was not confirmed');
          next = initialized;
        } catch {
          if (!isCurrent()) return null;
          next = { ...next, timezoneInitializationError: 'Your default timezone could not be saved. Choose and save your timezone in Profile, or retry loading your account.' };
        }
      }
      setIdentity(next);
      return next;
    } catch (error) {
      if (!isCurrent() || controller.signal.aborted) return null;
      logger.error('Account identity could not be loaded:', getErrorMessage(error));
      const failed = emptyIdentity('error', accountId, 'Your account and partner connection could not be loaded. Check your connection and try again.');
      setIdentity(failed);
      return failed;
    }
  }, [accountId]);

  const cancelCurrentRequests = useCallback(() => {
    mounted.current = false;
    generation.current++;
    commandGeneration.current++;
    request.current?.abort();
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refreshIdentity();
    return cancelCurrentRequests;
  }, [refreshIdentity, cancelCurrentRequests]);

  // Account changes must hide old getters in this render, before effects run.
  const relationshipIdentity = identity.currentUserId === accountId
    ? identity : emptyIdentity(accountId ? 'loading' : 'signed-out', accountId);

  const runCommand = async (command: () => Promise<unknown>, successMessage?: string, failureTitle = 'Unable to update partner connection'): Promise<IdentityState | null> => {
    if (!accountId || !mounted.current || currentAccount.current !== accountId) return null;
    const operation = ++commandGeneration.current;
    const isCurrent = () => mounted.current && currentAccount.current === accountId && commandGeneration.current === operation;
    setBusyAccount(accountId);
    try {
      await command();
      if (!isCurrent()) return null;
      const next = await refreshIdentity();
      if (!isCurrent()) return null;
      if (!next || !next.canAccessData) {
        toastManager.error('Refresh needed', 'The request completed, but the account status could not be refreshed. Retry before continuing.');
        return null;
      }
      if (successMessage) toastManager.success('Success', successMessage);
      return next;
    } catch (error) {
      if (isCurrent()) {
        logger.error('Partner request failed:', getErrorMessage(error));
        toastManager.error(failureTitle, identityCommandError(error));
      }
      return null;
    } finally {
      if (isCurrent()) setBusyAccount(null);
    }
  };

  const generateLinkCode = async (mode: LinkMode = 'fresh', previousRelationshipId: string | null = null): Promise<string | null> => {
    const expectedPeriod = relationshipIdentity.relationshipId;
    if (!expectedPeriod) return null;
    const next = await runCommand(() => callIdentityCommand(accountId, 'generate_partner_link_code', {
      p_expected_relationship_id: expectedPeriod, p_mode: mode, p_previous_relationship_id: previousRelationshipId,
    }));
    return next?.partnerLinkCode ?? null;
  };

  const previewPartnerCode = async (code: string): Promise<LinkPreview | null> => {
    if (!accountId || currentAccount.current !== accountId || !mounted.current) return null;
    const operation = ++commandGeneration.current;
    const isCurrent = () => mounted.current && currentAccount.current === accountId && commandGeneration.current === operation;
    setBusyAccount(accountId);
    try {
      const preview = await fetchLinkPreview(accountId, code);
      return isCurrent() ? preview : null;
    } catch (error) {
      if (isCurrent()) toastManager.error('Unable to review connection', identityCommandError(error));
      return null;
    } finally {
      if (isCurrent()) setBusyAccount(null);
    }
  };

  const linkToPartner = async (partnerCode: string, consent: LinkPreview): Promise<boolean> => {
    const expectedPeriod = relationshipIdentity.relationshipId;
    if (!expectedPeriod) return false;
    const next = await runCommand(() => callIdentityCommand(accountId, 'accept_partner_link_code', {
      p_expected_relationship_id: expectedPeriod, p_code: partnerCode.trim().toUpperCase(), p_mode: consent.mode,
      p_previous_relationship_id: consent.previousRelationshipId,
    }), 'Connected to your partner.');
    return next?.status === 'linked';
  };

  const unlinkFromPartner = async (): Promise<boolean> => {
    // Capture the period the person reviewed. Never replace it after a conflict.
    const expectedPeriod = relationshipIdentity.relationshipId;
    if (!expectedPeriod) {
      toastManager.error('Refresh needed', 'Load your current relationship before disconnecting.');
      return false;
    }
    const next = await runCommand(() => callIdentityCommand(accountId, 'unlink_my_partner', {
      p_expected_relationship_id: expectedPeriod,
    }), 'Partner disconnected.');
    return next?.status === 'unlinked';
  };

  const updateRelationshipPermissions = async (permissions: Record<string, PermissionChoice>): Promise<boolean> => {
    const expectedPeriod = relationshipIdentity.relationshipId;
    if (!expectedPeriod) return false;
    const next = await runCommand(() => callIdentityCommand(accountId, 'set_relationship_permissions', {
      p_permissions: permissions, p_expected_relationship_id: expectedPeriod,
    }), 'Relationship permissions updated.');
    return !!next?.canAccessData;
  };

  const updateTimezone = async (timezone: string): Promise<boolean> => {
    const next = await runCommand(() => callIdentityCommand(accountId, 'set_my_timezone', { p_timezone: timezone }), 'Timezone updated.', 'Unable to save timezone');
    return next?.timezone === timezone;
  };

  const getLinkedPartnerInfo = async (): Promise<{ id: string; role: 'sub' | 'dom'; email?: string } | null> => {
    if (currentAccount.current !== accountId || relationshipIdentity.status !== 'linked' || !relationshipIdentity.partnerUserId || !relationshipIdentity.partnerRole) return null;
    return { id: relationshipIdentity.partnerUserId, role: relationshipIdentity.partnerRole };
  };

  return {
    relationshipIdentity,
    refreshIdentity,
    generateLinkCode,
    previewPartnerCode,
    updateRelationshipPermissions,
    updateTimezone,
    linkToPartner,
    unlinkFromPartner,
    getLinkedPartnerInfo,
    getCurrentLinkCode: (): string | null => currentAccount.current === accountId ? relationshipIdentity.partnerLinkCode ?? null : null,
    getLinkedPartnerId: (): string | null => currentAccount.current === accountId && relationshipIdentity.status === 'linked' ? relationshipIdentity.partnerUserId : null,
    loading: busyAccount === accountId && !!accountId,
    partnerLinkingAvailable: relationshipIdentity.lifecycleReady === true,
  };
};
