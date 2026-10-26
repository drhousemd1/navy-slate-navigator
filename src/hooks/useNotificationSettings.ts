import { useRef } from 'react';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NotificationPreferences {
  enabled: boolean;
  types: {
    ruleBroken: boolean;
    taskCompleted: boolean;
    rewardPurchased: boolean;
    rewardRedeemed: boolean;
    rewardRefunded: boolean;
    punishmentPerformed: boolean;
    wellnessUpdated: boolean;
    wellnessCheckin: boolean;
    messages: boolean;
  };
}

const defaultPreferences: NotificationPreferences = {
  enabled: true,
  types: { ruleBroken: true, taskCompleted: true, rewardPurchased: true, rewardRedeemed: true,
    rewardRefunded: true, punishmentPerformed: true, wellnessUpdated: true, wellnessCheckin: true, messages: true },
};
const closedPreferences: NotificationPreferences = {
  enabled: false,
  types: { ruleBroken: false, taskCompleted: false, rewardPurchased: false, rewardRedeemed: false,
    rewardRefunded: false, punishmentPerformed: false, wellnessUpdated: false, wellnessCheckin: false, messages: false },
};
type PreferenceType = keyof NotificationPreferences['types'];
interface PreferenceEntry {
  accountId: string;
  preferences: NotificationPreferences;
  status: 'ready' | 'saving' | 'error';
  error?: string;
}
interface PreferenceChange { accountId: string; updates?: Partial<NotificationPreferences>; type?: PreferenceType; enabled?: boolean }
const queryKeyFor = (accountId: string | null) => ['notification-preferences', accountId] as const;
const mutationKeyFor = (accountId: string | null) => ['save-notification-preferences', accountId] as const;
const loadFailure = 'Notification preferences could not be loaded. Retry to review or change them.';
const saveFailure = 'Your notification change could not be confirmed. Reload your preferences before trying again.';

function decodePreferences(value: unknown): NotificationPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid notification preferences');
  const record = value as Record<string, unknown>;
  if (record.types != null && (typeof record.types !== 'object' || Array.isArray(record.types))) throw new Error('Invalid notification types');
  const types = (record.types ?? {}) as Record<string, unknown>;
  const readBoolean = (value: unknown, fallback: boolean): boolean => {
    if (value == null) return fallback;
    if (typeof value !== 'boolean') throw new Error('Invalid notification choice');
    return value;
  };
  return {
    enabled: readBoolean(record.enabled, defaultPreferences.enabled),
    types: Object.fromEntries(Object.entries(defaultPreferences.types).map(([name, fallback]) => [name, readBoolean(types[name], fallback)])) as NotificationPreferences['types'],
  };
}

async function checkedToken(accountId: string, signal?: AbortSignal): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (signal?.aborted) throw new DOMException('Preference request cancelled', 'AbortError');
  if (error || !session?.access_token || session.user.id !== accountId) throw new Error('The signed-in account changed. Reload your preferences before continuing.');
  return session.access_token;
}

export const useNotificationSettings = () => {
  const { user } = useAuth();
  const accountId = user?.id ?? null;
  const currentAccount = useRef(accountId);
  const confirmedAccount = useRef<string | null>(null);
  if (currentAccount.current !== accountId) confirmedAccount.current = null;
  currentAccount.current = accountId;
  const queryClient = useQueryClient();
  const queryKey = queryKeyFor(accountId);
  const mutationKey = mutationKeyFor(accountId);
  const isSaving = useIsMutating({ mutationKey, exact: true }) > 0;
  const query = useQuery<PreferenceEntry, Error>({
    queryKey,
    enabled: !!accountId && !isSaving,
    retry: false,
    staleTime: Infinity,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    networkMode: 'always',
    queryFn: async ({ signal }) => {
      if (!accountId) throw new Error('Sign in to load notification preferences.');
      const token = await checkedToken(accountId, signal);
      const { data, error } = await supabase.from('user_notification_preferences')
        .select('user_id,preferences').eq('user_id', accountId).abortSignal(signal).maybeSingle()
        .setHeader('Authorization', `Bearer ${token}`);
      if (error) throw new Error(loadFailure);
      if (data && data.user_id !== accountId) throw new Error(loadFailure);
      return { accountId, preferences: data === null ? { ...defaultPreferences, types: { ...defaultPreferences.types } } : decodePreferences(data.preferences), status: 'ready' };
    },
  });

  const mutation = useMutation({
    mutationKey,
    scope: { id: `notification-preferences:${accountId}` },
    retry: false,
    networkMode: 'always',
    mutationFn: async (change: PreferenceChange): Promise<void> => {
      const key = queryKeyFor(change.accountId);
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      const previous = queryClient.getQueryData<PreferenceEntry>(key);
      if (!previous || previous.accountId !== change.accountId || previous.status !== 'ready') throw new Error('Load your notification preferences before changing them.');
      const next = decodePreferences({ ...previous.preferences, ...change.updates,
        types: change.type ? { ...previous.preferences.types, [change.type]: change.enabled }
          : { ...previous.preferences.types, ...change.updates?.types } });
      // All instances see saving/error as disabled. Keep a marker so a late
      // reply cannot overwrite a replacement cache after logout or a new load.
      const pending = queryClient.setQueryData<PreferenceEntry>(key, { ...previous, status: 'saving' });
      try {
        const token = await checkedToken(change.accountId);
        const { data, error } = await supabase.from('user_notification_preferences')
          .upsert({ user_id: change.accountId, preferences: { enabled: next.enabled, types: { ...next.types } } }, { onConflict: 'user_id' })
          .select('user_id,preferences').single().setHeader('Authorization', `Bearer ${token}`);
        if (error || !data || data.user_id !== change.accountId) throw new Error(saveFailure);
        const confirmed = decodePreferences(data.preferences);
        if (queryClient.getQueryData(key) !== pending) throw new Error('Your account state changed. Reload your preferences.');
        queryClient.setQueryData<PreferenceEntry>(key, { accountId: change.accountId, preferences: confirmed, status: 'ready' });
      } catch (error) {
        if (queryClient.getQueryData(key) === pending) queryClient.setQueryData<PreferenceEntry>(key, { ...previous, status: 'error', error: saveFailure });
        throw error;
      }
    },
  });

  const saveChange = async (change: Omit<PreferenceChange, 'accountId'>) => {
    if (!accountId || currentAccount.current !== accountId) throw new Error('The signed-in account changed. Reload your preferences.');
    await mutation.mutateAsync({ ...change, accountId });
    if (currentAccount.current !== accountId) throw new Error('The signed-in account changed. Reload your preferences.');
  };
  const loadError = query.isError ? loadFailure : query.data?.status === 'error' ? query.data.error ?? saveFailure : null;
  const isReady = !!accountId && query.isSuccess && !query.isFetching && !isSaving && !loadError &&
    query.data.accountId === accountId && query.data.status === 'ready';
  if (isReady) confirmedAccount.current = accountId;
  const hasConfirmedDisplay = !!accountId && confirmedAccount.current === accountId &&
    query.data?.accountId === accountId && !loadError;

  return {
    accountId,
    isReady,
    // Keep confirmed switch positions during a same-account refresh/save.
    // Notification consumers must also require accountId + isReady.
    preferences: hasConfirmedDisplay ? query.data.preferences : closedPreferences,
    isLoading: !!accountId && (query.isPending || query.isFetching),
    isSaving,
    loadError,
    updatePreferences: (updates: Partial<NotificationPreferences>) => saveChange({ updates }),
    updateNotificationType: (type: PreferenceType, enabled: boolean) => saveChange({ type, enabled }),
    toggleNotifications: (enabled: boolean) => saveChange({ updates: { enabled } }),
    loadPreferences: async () => {
      if (accountId && currentAccount.current === accountId && !isSaving) await query.refetch();
    },
  };
};
