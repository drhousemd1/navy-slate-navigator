import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ accountId: 'A', request: vi.fn(), get: vi.fn(), device: vi.fn(), reload: vi.fn(), session: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: mocks.accountId } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://diagnostic.invalid', supabase: { auth: { getSession: mocks.session } } }));
vi.mock('@/data/notifications/api', () => ({ requestPushTest: mocks.request, getPushTest: mocks.get, getPushDevice: mocks.device, revokePushDevice: vi.fn(), notificationError: () => 'The test could not be confirmed. Check its status before trying again.' }));
vi.mock('@/hooks/usePushSubscription', () => ({ usePushSubscription: () => ({ isSubscribed: true, isLoading: false, status: 'enabled', error: null, checkSubscriptionStatus: mocks.reload }) }));
import { PushNotificationDebugPanel } from '@/components/debug/PushNotificationDebugPanel';
import { pushNotificationTest } from '@/utils/pushNotificationTest';
import { readPushTestIntent, savePushTestIntent } from '@/lib/pushDeviceTest';

const deviceId = '00000000-0000-4000-8000-000000000001';
const commandId = '00000000-0000-4000-8000-000000000002';
const jobId = '00000000-0000-4000-8000-000000000003';
const deviceKey = 'obedience:push-device:v1:https://diagnostic.invalid';
const receipt = (id = commandId, status = 'queued') => ({ deviceId, commandId: id, jobId, status });
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; };
beforeEach(() => {
  localStorage.clear(); localStorage.setItem(deviceKey, deviceId); mocks.accountId = 'A';
  mocks.request.mockReset().mockImplementation(async (_account, device, command) => ({ deviceId: device, commandId: command, jobId }));
  mocks.get.mockReset().mockImplementation(async (_account, command) => receipt(command));
  mocks.reload.mockReset().mockResolvedValue(undefined); mocks.device.mockReset().mockResolvedValue({ enabled: true });
  mocks.session.mockReset().mockImplementation(async () => ({ data: { session: { user: { id: mocks.accountId } } }, error: null }));
});
afterEach(cleanup);
describe('fixed current-device push diagnostics', () => {
  it('never queues a test just by opening the panel', () => {
    render(<PushNotificationDebugPanel />); expect(mocks.request).not.toHaveBeenCalled(); expect(mocks.get).not.toHaveBeenCalled();
  });
  it('preserves an uncertain command across remount, checks only, and retries its exact device and ID', async () => {
    mocks.request.mockRejectedValueOnce(new Error('NOTIFICATION_REQUEST_TIMEOUT'));
    const view = render(<PushNotificationDebugPanel />); fireEvent.click(screen.getByRole('button', { name: 'Test this device' }));
    await screen.findByRole('alert'); const intent = readPushTestIntent('A', deviceId)!;
    expect(intent.commandId).toBeTruthy(); expect(mocks.request.mock.calls[0].slice(0, 3)).toEqual(['A', deviceId, intent.commandId]);
    view.unmount(); mocks.get.mockResolvedValue(null); render(<PushNotificationDebugPanel />);
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('A', intent.commandId, expect.any(AbortSignal)));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Retry same test' }) as HTMLButtonElement).disabled).toBe(false));
    expect(mocks.request).toHaveBeenCalledOnce(); fireEvent.click(screen.getByRole('button', { name: 'Retry same test' }));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(2));
    expect(mocks.request.mock.calls[1].slice(0, 3)).toEqual(['A', deviceId, intent.commandId]);
  });
  it('shows queued and push-service acceptance without claiming the notification appeared', async () => {
    render(<PushNotificationDebugPanel />); fireEvent.click(screen.getByRole('button', { name: 'Test this device' }));
    await screen.findByText('Test queued for this device. Delivery is not yet confirmed.');
    expect((screen.getByRole('button', { name: 'Request a new device test' }) as HTMLButtonElement).disabled).toBe(true);
    mocks.get.mockImplementation(async (_account, command) => receipt(command, 'acceptedByPushService'));
    fireEvent.click(screen.getByRole('button', { name: 'Check test status' }));
    await screen.findByText('The push service accepted the test. This does not confirm it appeared on your device.');
    expect((screen.getByRole('button', { name: 'Request a new device test' }) as HTMLButtonElement).disabled).toBe(false);
  });
  it('does not let a late old-account result populate the new account or start another request', async () => {
    const pending = deferred<{ deviceId: string; commandId: string; jobId: string }>(); mocks.request.mockReturnValue(pending.promise);
    const view = render(<PushNotificationDebugPanel />); fireEvent.click(screen.getByRole('button', { name: 'Test this device' }));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledOnce()); const intent = readPushTestIntent('A', deviceId)!;
    mocks.accountId = 'B'; view.rerender(<PushNotificationDebugPanel />);
    await act(async () => pending.resolve({ ...intent, jobId }));
    expect(screen.getByRole('button', { name: 'Test this device' })).toBeTruthy(); expect(screen.queryByText(/Test queued/)).toBeNull();
    expect(readPushTestIntent('B', deviceId)).toBeNull(); expect(mocks.get).not.toHaveBeenCalled();
  });
  it('preserves unreadable saved command bytes and refuses to replace them with a new test', async () => {
    const key = `obedience:push-test:v1:https://diagnostic.invalid:A:${deviceId}`; localStorage.setItem(key, '{invalid');
    render(<PushNotificationDebugPanel />); await screen.findByText('The saved test request could not be read. It has not been replaced.');
    expect((screen.getByRole('button', { name: 'Test this device' }) as HTMLButtonElement).disabled).toBe(true);
    expect(localStorage.getItem(key)).toBe('{invalid'); expect(mocks.request).not.toHaveBeenCalled();
  });
  it('checks an intent saved by another view instead of overwriting it from a stale panel', async () => {
    render(<PushNotificationDebugPanel />); savePushTestIntent('A', { deviceId, commandId });
    fireEvent.click(screen.getByRole('button', { name: 'Test this device' }));
    await screen.findByText('Test queued for this device. Delivery is not yet confirmed.');
    expect(mocks.get).toHaveBeenCalledWith('A', commandId, expect.any(AbortSignal)); expect(mocks.request).not.toHaveBeenCalled();
    expect(readPushTestIntent('A', deviceId)).toEqual({ deviceId, commandId });
  });
  it('keeps console status read-only and explicit test requests fixed to the signed-in device', async () => {
    expect(await pushNotificationTest()).toMatchObject({ status: 'registered' }); expect(mocks.request).not.toHaveBeenCalled();
    savePushTestIntent('A', { deviceId, commandId });
    expect(await pushNotificationTest('test')).toMatchObject({ status: 'queued' });
    expect(mocks.request).toHaveBeenCalledWith('A', deviceId, commandId);
    expect(await pushNotificationTest('new-test')).toMatchObject({ status: 'queued' }); expect(mocks.request).toHaveBeenCalledOnce();
    expect(readPushTestIntent('A', deviceId)).toEqual({ deviceId, commandId });
  });
});
