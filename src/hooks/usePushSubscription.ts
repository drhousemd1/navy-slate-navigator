import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getPushDevice, notificationError, registerPushDevice, revokePushDevice } from '@/data/notifications/api';
import { clearPushDeviceBinding, getOrCreatePushDeviceId as deviceId, readPushDeviceBinding as readBinding, writePushDeviceBinding } from '@/lib/pushDevice';

type DeviceStatus = 'checking' | 'enabled' | 'disabled' | 'needs_setup' | 'unavailable' | 'unsupported';
interface PublicKey { publicKey: string; keyId: string }
interface DeviceView { accountId: string | null; status: DeviceStatus; isLoading: boolean; supported: boolean; hasBrowserSubscription: boolean; error: string | null; key: PublicKey | null }
const blank = (accountId: string | null): DeviceView => ({ accountId, status: 'checking', isLoading: !!accountId, supported: false, hasBrowserSubscription: false, error: null, key: null });
function base64url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function keyBytes(value: string): Uint8Array {
  const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(raw, character => character.charCodeAt(0));
}
async function digest(value: string) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(byte => byte.toString(16).padStart(2, '0')).join(''); }
function subscriptionData(subscription: PushSubscription) {
  const key = subscription.getKey('p256dh'); const auth = subscription.getKey('auth');
  if (!key || !auth) throw new Error('INVALID_PUSH_SUBSCRIPTION');
  return { endpoint: subscription.endpoint, p256dh: base64url(key), auth: base64url(auth) };
}
async function fingerprint(subscription: PushSubscription) { return digest(JSON.stringify(subscriptionData(subscription))); }
async function bounded<T>(operation: (signal: AbortSignal) => Promise<T>, outer?: AbortSignal): Promise<T> {
  const controller = new AbortController(); const abort = () => controller.abort();
  outer?.addEventListener('abort', abort, { once: true }); if (outer?.aborted) abort();
  let timer: ReturnType<typeof setTimeout>;
  try { return await Promise.race([operation(controller.signal), new Promise<never>((_, reject) => {
    controller.signal.addEventListener('abort', () => reject(new Error('PUSH_REQUEST_UNCONFIRMED')), { once: true });
    if (controller.signal.aborted) reject(new Error('PUSH_REQUEST_UNCONFIRMED'));
    timer = setTimeout(() => { controller.abort(); reject(new Error('PUSH_REQUEST_UNCONFIRMED')); }, 12000);
  })]); } finally { clearTimeout(timer!); controller.abort(); outer?.removeEventListener('abort', abort); }
}
async function publicKey(): Promise<PublicKey> {
  const { data, error } = await supabase.functions.invoke('get-vapid-public-key');
  if (error || !/^[A-Za-z0-9_-]{87}$/.test(data?.publicKey ?? '') || !/^[a-f0-9]{64}$/.test(data?.keyId ?? '') || await digest(data.publicKey) !== data.keyId || keyBytes(data.publicKey)[0] !== 4) throw new Error('PUSH_UNAVAILABLE');
  return { publicKey: data.publicKey, keyId: data.keyId };
}
function errorText(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  if (code === 'PUSH_UNAVAILABLE') return 'Push setup is currently unavailable. Your account preferences are unchanged.';
  if (code.startsWith('DEVICE_STORAGE')) return 'This browser could not keep its device identity. Check browser storage and retry.';
  if (code === 'PUSH_REQUEST_UNCONFIRMED') return 'This device setting could not be confirmed. Reload its status before trying again.';
  if (code === 'PUSH_PERMISSION_DENIED') return 'Allow notifications for this site in browser settings before enabling this device.';
  if (code === 'PUSH_WORKER_UNAVAILABLE') return 'This browser is not ready for push. Reload the app and try again.';
  if (code === 'PUSH_BROWSER_CLEANUP_FAILED') return 'Delivery for this account is disabled, but the browser subscription could not be removed. Retry disabling this device.';
  return notificationError(error);
}

export function usePushSubscription() {
  const { user } = useAuth(); const accountId = user?.id ?? null;
  const current = useRef(accountId); const generation = useRef(0); const busy = useRef(false);
  if (current.current !== accountId) { current.current = accountId; generation.current++; busy.current = false; }
  const [state, setState] = useState<DeviceView>(() => blank(accountId));
  const visible = state.accountId === accountId ? state : blank(accountId);
  const checkSubscriptionStatus = useCallback(async (outer?: AbortSignal) => {
    if (!accountId || busy.current) return;
    const run = ++generation.current;
    const active = () => current.current === accountId && generation.current === run && !outer?.aborted;
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if (!supported) { if (active()) setState({ ...blank(accountId), status: 'unsupported', isLoading: false }); return; }
    setState(previous => ({ ...(previous.accountId === accountId ? previous : blank(accountId)), accountId, isLoading: true, supported: true, error: null }));
    try {
      await bounded(async signal => {
        const id = deviceId();
        const [saved, registration, config] = await Promise.all([
          getPushDevice(accountId, id, signal), navigator.serviceWorker.getRegistration(), publicKey().then(value => ({ value, error: null }), error => ({ value: null, error })),
        ]);
        const subscription = registration?.pushManager ? await registration.pushManager.getSubscription() : null;
        const binding = readBinding();
        const proof = subscription ? await fingerprint(subscription) : null;
        if (!active() || signal.aborted) return;
        const verified = !!subscription && Notification.permission === 'granted' && saved.enabled && config.value?.keyId === saved.vapidKeyId && binding?.accountId === accountId && binding?.subscriptionId === saved.subscriptionId && binding?.keyId === saved.vapidKeyId && binding?.fingerprint === proof;
        setState({ accountId, supported: true, isLoading: false, hasBrowserSubscription: !!subscription, key: config.value,
          status: verified ? 'enabled' : saved.enabled || subscription ? 'needs_setup' : 'disabled', error: config.error ? errorText(config.error) : null });
      }, outer);
    } catch (error) { if (active()) setState(previous => ({ ...previous, accountId, supported: true, status: 'unavailable', isLoading: false, error: errorText(error) })); }
  }, [accountId]);
  useEffect(() => {
    const controller = new AbortController(); void checkSubscriptionStatus(controller.signal);
    return () => { controller.abort(); generation.current++; };
  }, [checkSubscriptionStatus]);

  const subscribe = async (): Promise<boolean> => {
    if (!accountId || busy.current || !visible.supported || !visible.key || visible.isLoading) return false;
    const run = ++generation.current; const key = visible.key; busy.current = true;
    const active = () => current.current === accountId && generation.current === run;
    // Permission is requested only here, directly from the explicit device button.
    setState(previous => ({ ...previous, isLoading: true, error: null }));
    try {
      const permission = Notification.permission === 'default' ? Notification.requestPermission() : Promise.resolve(Notification.permission);
      await bounded(async signal => {
        if (await permission !== 'granted') throw new Error('PUSH_PERMISSION_DENIED');
        if (!active() || signal.aborted) throw new Error('NOTIFICATION_ACCOUNT_CHANGED');
        const id = deviceId(); const registration = await navigator.serviceWorker.ready;
        if (!active() || signal.aborted) throw new Error('NOTIFICATION_ACCOUNT_CHANGED');
        if (!registration?.pushManager) throw new Error('PUSH_WORKER_UNAVAILABLE');
        let subscription = await registration.pushManager.getSubscription();
        if (!active() || signal.aborted) throw new Error('NOTIFICATION_ACCOUNT_CHANGED');
        if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key.publicKey) as BufferSource });
        if (!active() || signal.aborted) throw new Error('NOTIFICATION_ACCOUNT_CHANGED');
        const browserKey = subscription.options?.applicationServerKey;
        if (browserKey && base64url(browserKey as ArrayBuffer) !== key.publicKey) throw new Error('PUSH_DEVICE_REQUIRES_RESUBSCRIBE');
        const saved = await registerPushDevice(accountId, { deviceId: id, ...subscriptionData(subscription), vapidKeyId: key.keyId }, signal);
        const proof = await fingerprint(subscription);
        if (!active() || signal.aborted) throw new Error('NOTIFICATION_ACCOUNT_CHANGED');
        writePushDeviceBinding({ accountId, subscriptionId: saved.subscriptionId!, keyId: saved.vapidKeyId!, fingerprint: proof });
        setState({ accountId, supported: true, status: 'enabled', isLoading: false, hasBrowserSubscription: true, key, error: null });
      });
      return active();
    } catch (error) { if (active()) setState(previous => ({ ...previous, status: 'unavailable', isLoading: false, error: errorText(error) })); return false; }
    finally { if (active()) { busy.current = false; setState(previous => ({ ...previous, isLoading: false })); } }
  };
  const unsubscribe = async (): Promise<boolean> => {
    if (!accountId || busy.current || visible.isLoading) return false;
    const run = ++generation.current; busy.current = true;
    const active = () => current.current === accountId && generation.current === run;
    setState(previous => ({ ...previous, isLoading: true, error: null }));
    try {
      await bounded(async signal => {
        const id = deviceId(); const binding = readBinding();
        await revokePushDevice(accountId, id, signal);
        if (!active() || signal.aborted) throw new Error('NOTIFICATION_ACCOUNT_CHANGED');
        // Revoke only this device on the server before touching this browser.
        const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
        const subscription = registration?.pushManager ? await registration.pushManager.getSubscription() : null;
        if (!active() || signal.aborted) throw new Error('NOTIFICATION_ACCOUNT_CHANGED');
        if (subscription && !await subscription.unsubscribe()) throw new Error('PUSH_BROWSER_CLEANUP_FAILED');
        if (!active() || signal.aborted) throw new Error('NOTIFICATION_ACCOUNT_CHANGED');
        clearPushDeviceBinding(accountId, id, binding);
        setState(previous => ({ ...previous, accountId, status: 'disabled', hasBrowserSubscription: false, isLoading: false, error: null }));
      });
      return active();
    } catch (error) { if (active()) setState(previous => ({ ...previous, status: 'unavailable', isLoading: false, error: errorText(error) })); return false; }
    finally { if (active()) { busy.current = false; setState(previous => ({ ...previous, isLoading: false })); } }
  };
  return { accountId, isSubscribed: visible.status === 'enabled', isSupported: visible.supported, isLoading: visible.isLoading,
    status: visible.status, error: visible.error, canEnable: !!visible.key && visible.supported && !visible.isLoading && ['disabled', 'needs_setup'].includes(visible.status),
    hasBrowserSubscription: visible.hasBrowserSubscription, subscribe, unsubscribe,
    checkSubscriptionStatus: () => checkSubscriptionStatus(),
  };
}
