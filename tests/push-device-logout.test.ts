import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ revoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://logout.invalid' }));
vi.mock('@/data/notifications/api', () => ({ revokePushDevice: mocks.revoke }));
import { readPushDeviceId, revokeCurrentPushDeviceBeforeSignOut, writePushDeviceBinding } from '@/lib/pushDevice';
const deviceId = '00000000-0000-4000-8000-000000000001';
const deviceKey = 'obedience:push-device:v1:https://logout.invalid';
const binding = { accountId: 'A', subscriptionId: 'subscription-A', fingerprint: 'fingerprint-A', keyId: 'key-A' };
beforeEach(() => { localStorage.clear(); mocks.revoke.mockReset().mockResolvedValue(undefined); });
afterEach(() => { vi.useRealTimers(); });
describe('best-effort current-device logout revocation', () => {
  it('does not create an identity or contact the server when this browser has no device', async () => {
    expect(await revokeCurrentPushDeviceBeforeSignOut('A')).toBe('not_registered');
    expect(readPushDeviceId()).toBeNull(); expect(mocks.revoke).not.toHaveBeenCalled();
  });
  it('revokes only the captured account/device and clears its matching binding on confirmation', async () => {
    localStorage.setItem(deviceKey, deviceId); writePushDeviceBinding(binding);
    expect(await revokeCurrentPushDeviceBeforeSignOut('A')).toBe('revoked');
    expect(mocks.revoke).toHaveBeenCalledWith('A', deviceId, expect.any(AbortSignal));
    expect(localStorage.getItem(`${deviceKey}:binding`)).toBeNull(); expect(readPushDeviceId()).toBe(deviceId);
  });
  it('preserves a new account binding after a late old-account revoke', async () => {
    localStorage.setItem(deviceKey, deviceId); writePushDeviceBinding(binding);
    let finish!: () => void; mocks.revoke.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    const pending = revokeCurrentPushDeviceBeforeSignOut('A');
    const next = { ...binding, accountId: 'B', subscriptionId: 'subscription-B' }; writePushDeviceBinding(next);
    finish(); expect(await pending).toBe('revoked');
    expect(JSON.parse(localStorage.getItem(`${deviceKey}:binding`)!)).toEqual(next);
  });
  it('returns unconfirmed within five seconds and retains the binding even if a response arrives later', async () => {
    vi.useFakeTimers(); localStorage.setItem(deviceKey, deviceId); writePushDeviceBinding(binding);
    let finish!: () => void; mocks.revoke.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    const pending = revokeCurrentPushDeviceBeforeSignOut('A');
    await vi.advanceTimersByTimeAsync(5001); expect(await pending).toBe('unconfirmed');
    finish(); await Promise.resolve(); expect(JSON.parse(localStorage.getItem(`${deviceKey}:binding`)!)).toEqual(binding);
    expect(mocks.revoke.mock.calls[0][2].aborted).toBe(true);
  });
  it('returns unconfirmed on a network failure without clearing the saved binding', async () => {
    localStorage.setItem(deviceKey, deviceId); writePushDeviceBinding(binding); mocks.revoke.mockRejectedValue(new Error('offline'));
    expect(await revokeCurrentPushDeviceBeforeSignOut('A')).toBe('unconfirmed');
    expect(JSON.parse(localStorage.getItem(`${deviceKey}:binding`)!)).toEqual(binding);
  });
});
