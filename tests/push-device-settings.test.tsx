import React from 'react';
import { webcrypto } from 'node:crypto';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ accountId: '00000000-0000-4000-8000-000000000001' as string | null, get: vi.fn(), register: vi.fn(), revoke: vi.fn(), invoke: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.accountId ? { id: mocks.accountId } : null }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://device.invalid', supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock('@/data/notifications/api', () => ({ getPushDevice: mocks.get, registerPushDevice: mocks.register, revokePushDevice: mocks.revoke, notificationError: () => 'This notification setting could not be confirmed. Reload its saved state before trying again.' }));
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { PushDeviceSettings } from '@/components/profile/PushDeviceSettings';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useSmartMessageNotifications } from '@/hooks/useSmartMessageNotifications';

const accountA = '00000000-0000-4000-8000-000000000001'; const accountB = '00000000-0000-4000-8000-000000000002';
const subscriptionId = '00000000-0000-4000-8000-000000000003';
const deviceKey = 'obedience:push-device:v1:https://device.invalid';
let key: Uint8Array; let publicKey: string; let keyId: string; let registration: any; let subscription: any; let permission: ReturnType<typeof vi.fn>;
const delay = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; };
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
beforeEach(async () => {
  localStorage.clear(); mocks.accountId = accountA; mocks.get.mockReset(); mocks.register.mockReset(); mocks.revoke.mockReset(); mocks.invoke.mockReset();
  Object.defineProperty(globalThis.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
  key = new Uint8Array(65); key[0] = 4; publicKey = Buffer.from(key).toString('base64url'); keyId = Buffer.from(await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(publicKey))).toString('hex');
  permission = vi.fn(async () => 'granted'); vi.stubGlobal('Notification', { permission: 'granted', requestPermission: permission }); vi.stubGlobal('PushManager', class {});
  subscription = { endpoint: 'https://push.invalid/synthetic-endpoint', getKey: vi.fn(name => name === 'p256dh' ? key.buffer : new Uint8Array(16).buffer), options: { applicationServerKey: key.buffer }, unsubscribe: vi.fn(async () => true) };
  registration = { pushManager: { getSubscription: vi.fn(async () => null), subscribe: vi.fn(async () => subscription) } };
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve(registration), getRegistration: vi.fn(async () => registration) } });
  mocks.invoke.mockResolvedValue({ data: { publicKey, keyId }, error: null });
  mocks.get.mockImplementation(async (_account, deviceId) => ({ deviceId, subscriptionId: null, enabled: false, vapidKeyId: null }));
  mocks.register.mockImplementation(async (_account, input) => ({ deviceId: input.deviceId, subscriptionId, enabled: true, vapidKeyId: keyId })); mocks.revoke.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('current browser push registration', () => {
  it('reads only current device state on mount and never asks permission or subscribes automatically', async () => {
    const { result } = renderHook(usePushSubscription); await waitFor(() => expect(result.current.status).toBe('disabled'));
    expect(mocks.get).toHaveBeenCalledWith(accountA, localStorage.getItem(deviceKey), expect.any(AbortSignal));
    expect(permission).not.toHaveBeenCalled(); expect(registration.pushManager.subscribe).not.toHaveBeenCalled(); expect(mocks.register).not.toHaveBeenCalled();
  });
  it('does not claim enabled when the server has a row but this browser lacks a matching verified binding', async () => {
    mocks.get.mockImplementation(async (_account, deviceId) => ({ deviceId, subscriptionId, enabled: true, vapidKeyId: keyId }));
    registration.pushManager.getSubscription.mockResolvedValue(subscription);
    const { result } = renderHook(usePushSubscription); await waitFor(() => expect(result.current.status).toBe('needs_setup'));
    expect(result.current.isSubscribed).toBe(false); expect(mocks.register).not.toHaveBeenCalled();
  });
  it('registers only after explicit action and reports failure honestly without deleting other devices', async () => {
    const { result } = renderHook(usePushSubscription); await waitFor(() => expect(result.current.canEnable).toBe(true));
    mocks.register.mockRejectedValueOnce(new Error('NETWORK_UNCERTAIN'));
    await act(async () => { expect(await result.current.subscribe()).toBe(false); });
    expect(result.current.isSubscribed).toBe(false); expect(result.current.error).toBeTruthy(); expect(result.current.canEnable).toBe(false); expect(mocks.revoke).not.toHaveBeenCalled();
    registration.pushManager.getSubscription.mockResolvedValue(subscription);
    await act(async () => { await result.current.checkSubscriptionStatus(); });
    await act(async () => { expect(await result.current.subscribe()).toBe(true); });
    expect(result.current.isSubscribed).toBe(true); expect(mocks.register.mock.calls[1][0]).toBe(accountA);
    expect(mocks.register.mock.calls[1][1]).toMatchObject({ deviceId: localStorage.getItem(deviceKey), endpoint: subscription.endpoint, vapidKeyId: keyId });
    expect(mocks.register.mock.calls[1][1].p256dh).toHaveLength(87); expect(mocks.register.mock.calls[1][1].auth).toHaveLength(22);
  });
  it('recognizes the same verified browser after reload, not another account', async () => {
    const view = renderHook(usePushSubscription); await waitFor(() => expect(view.result.current.canEnable).toBe(true)); await act(async () => { await view.result.current.subscribe(); }); view.unmount();
    mocks.get.mockImplementation(async (_account, deviceId) => ({ deviceId, subscriptionId, enabled: true, vapidKeyId: keyId })); registration.pushManager.getSubscription.mockResolvedValue(subscription);
    const next = renderHook(usePushSubscription); await waitFor(() => expect(next.result.current.isSubscribed).toBe(true));
    mocks.accountId = accountB; next.rerender(); expect(next.result.current.isSubscribed).toBe(false); await waitFor(() => expect(next.result.current.status).toBe('needs_setup')); expect(mocks.register).toHaveBeenCalledTimes(1);
  });
  it('requires setup again when the public push key has changed since registration', async () => {
    const view = renderHook(usePushSubscription); await waitFor(() => expect(view.result.current.canEnable).toBe(true));
    await act(async () => { await view.result.current.subscribe(); }); view.unmount();
    mocks.get.mockImplementation(async (_account, deviceId) => ({ deviceId, subscriptionId, enabled: true, vapidKeyId: keyId })); registration.pushManager.getSubscription.mockResolvedValue(subscription);
    const changedKey = new Uint8Array(key); changedKey[1] = 1; const changedPublicKey = Buffer.from(changedKey).toString('base64url');
    const changedKeyId = Buffer.from(await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(changedPublicKey))).toString('hex');
    mocks.invoke.mockResolvedValue({ data: { publicKey: changedPublicKey, keyId: changedKeyId }, error: null });
    const next = renderHook(usePushSubscription); await waitFor(() => expect(next.result.current.status).toBe('needs_setup'));
    expect(next.result.current.isSubscribed).toBe(false); expect(mocks.register).toHaveBeenCalledOnce();
  });
  it('revokes only this device before browser unsubscribe, and leaves the browser unchanged on failed revoke', async () => {
    registration.pushManager.getSubscription.mockResolvedValue(subscription);
    const { result } = renderHook(usePushSubscription); await waitFor(() => expect(result.current.isLoading).toBe(false));
    mocks.revoke.mockRejectedValueOnce(new Error('Unknown revoke'));
    await act(async () => { expect(await result.current.unsubscribe()).toBe(false); }); expect(subscription.unsubscribe).not.toHaveBeenCalled();
    await act(async () => { expect(await result.current.unsubscribe()).toBe(true); });
    expect(mocks.revoke).toHaveBeenLastCalledWith(accountA, localStorage.getItem(deviceKey), expect.any(AbortSignal)); expect(subscription.unsubscribe).toHaveBeenCalledTimes(1); expect(result.current.status).toBe('disabled');
  });
  it('ignores a late account-A registration after switching to account B', async () => {
    const pending = delay<any>(); mocks.register.mockReturnValue(pending.promise);
    const { result, rerender } = renderHook(usePushSubscription); await waitFor(() => expect(result.current.canEnable).toBe(true));
    let work!: Promise<boolean>; act(() => { work = result.current.subscribe(); }); await waitFor(() => expect(mocks.register).toHaveBeenCalledOnce());
    mocks.accountId = accountB; rerender(); await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { pending.resolve({ deviceId: localStorage.getItem(deviceKey), subscriptionId, enabled: true, vapidKeyId: keyId }); expect(await work).toBe(false); });
    expect(result.current.isSubscribed).toBe(false); expect(localStorage.getItem(`${deviceKey}:binding`)).toBeNull();
  });
  it('bounds never-settling registration and requires status reload before another enable', async () => {
    const { result } = renderHook(usePushSubscription); await waitFor(() => expect(result.current.canEnable).toBe(true)); vi.useFakeTimers(); mocks.register.mockReturnValue(new Promise(() => {}));
    let work!: Promise<boolean>; act(() => { work = result.current.subscribe(); }); await act(flush); await act(async () => { await vi.advanceTimersByTimeAsync(12001); await work; });
    expect(result.current.isLoading).toBe(false); expect(result.current.isSubscribed).toBe(false); expect(result.current.error).toMatch(/could not be confirmed/); expect(result.current.canEnable).toBe(false);
  });
  it('shows unavailable setup without changing account preferences or prompting permission', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: new Error('operator details must not appear') }); render(<PushDeviceSettings />);
    await screen.findByText('Push setup is currently unavailable. Your account preferences are unchanged.'); expect((screen.getByRole('button', { name: 'Enable this device' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText(/operator details/)).toBeNull(); expect(permission).not.toHaveBeenCalled();
  });
  it('deactivates legacy arbitrary-recipient senders without a network call or false success', async () => {
    const sends = usePushNotifications(); expect(await sends.sendNotification({ targetUserId: accountB, type: 'test', title: 'Synthetic', body: 'Synthetic' })).toBe(false);
    expect(await useSmartMessageNotifications().sendNewMessageNotification(accountB, 'Synthetic', 'Synthetic')).toBe(false); expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
