import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getPushDevice, getWellnessReminder, requestPushTest, getPushTest, registerPushDevice, revokePushDevice, saveWellnessReminder, NOTIFICATION_REQUEST_TIMEOUT_MS } from '@/data/notifications/api';
const mock = vi.hoisted(() => ({ network: vi.fn(), actor: '10000000-0000-4000-8000-000000000001' }));
vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return { supabase: createClient('https://notification-api.invalid', 'fixture-public', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: mock.network },
  }) };
});
const actor = '10000000-0000-4000-8000-000000000001', device = '10000000-0000-4000-8000-000000000002', subscription = '10000000-0000-4000-8000-000000000003';
const deviceResponse = { deviceId: device, subscriptionId: subscription, enabled: true, vapidKeyId: 'a'.repeat(64) };
const reminderResponse = { id: subscription, user_id: actor, enabled: false, reminder_time: '09:15:00', timezone: 'America/Boise',
  next_due_at: null, last_sent: null, created_at: '2026-10-27T12:00:00Z', updated_at: '2026-10-27T12:00:00Z' };
const response = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
beforeEach(() => {
  mock.actor = actor; mock.network.mockReset();
  vi.spyOn(supabase.auth, 'getSession').mockImplementation(async () => ({ data: { session: {
    user: { id: mock.actor }, access_token: `fixture-${mock.actor}`, refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600,
  } as Session }, error: null }));
});
afterEach(() => { vi.useRealTimers(); });
it('pins the checked account token and registers one device without caller-supplied user identity', async () => {
  mock.network.mockResolvedValue(response(deviceResponse));
  await registerPushDevice(actor, { deviceId: device, endpoint: 'https://fcm.googleapis.com/synthetic', p256dh: 'A'.repeat(87), auth: 'B'.repeat(22), vapidKeyId: 'a'.repeat(64) });
  const [url, init] = mock.network.mock.calls[0];
  expect(String(url)).toContain('/rpc/register_my_push_device');
  expect(new Headers(init.headers).get('Authorization')).toBe(`Bearer fixture-${actor}`);
  const body = JSON.parse(init.body); expect(body).toHaveProperty('p_device_id', device); expect(body).not.toHaveProperty('user_id');
});
it('rejects a different device or key in the response', async () => {
  mock.network.mockResolvedValueOnce(response({ ...deviceResponse, deviceId: actor }));
  await expect(getPushDevice(actor, device)).rejects.toThrow('INVALID_DEVICE_RESPONSE');
  mock.network.mockResolvedValueOnce(response({ ...deviceResponse, vapidKeyId: 'b'.repeat(64) }));
  await expect(registerPushDevice(actor, { deviceId: device, endpoint: 'https://fcm.googleapis.com/synthetic', p256dh: 'A'.repeat(87), auth: 'B'.repeat(22), vapidKeyId: 'a'.repeat(64) })).rejects.toThrow('INVALID_DEVICE_RESPONSE');
});
it('account changes before sending cause no RPC; late responses cannot become new-account state', async () => {
  mock.actor = subscription;
  await expect(getPushDevice(actor, device)).rejects.toThrow('NOTIFICATION_ACCOUNT_CHANGED'); expect(mock.network).not.toHaveBeenCalled();
  mock.actor = actor;
  mock.network.mockImplementation(async () => { mock.actor = subscription; return response(deviceResponse); });
  await expect(getPushDevice(actor, device)).rejects.toThrow('NOTIFICATION_ACCOUNT_CHANGED');
});
it('revocation targets the current device only', async () => {
  mock.network.mockResolvedValue(response(null)); await revokePushDevice(actor, device);
  expect(JSON.parse(mock.network.mock.calls[0][1].body)).toEqual({ p_device_id: device });
});
it('disabling is a saved operation; browser timezone and owner are never submitted', async () => {
  mock.network.mockResolvedValue(response(reminderResponse));
  expect(await saveWellnessReminder(actor, false, '09:15')).toEqual(reminderResponse);
  expect(JSON.parse(mock.network.mock.calls[0][1].body)).toEqual({ p_enabled: false, p_reminder_time: '09:15:00' });
});
it('rejects malformed times, another owner, and a response that did not persist disabling', async () => {
  await expect(saveWellnessReminder(actor, false, '24:00')).rejects.toThrow('INVALID_REMINDER_TIME'); expect(mock.network).not.toHaveBeenCalled();
  mock.network.mockResolvedValueOnce(response({ ...reminderResponse, user_id: subscription }));
  await expect(getWellnessReminder(actor)).rejects.toThrow('INVALID_REMINDER_RESPONSE');
  mock.network.mockResolvedValueOnce(response({ ...reminderResponse, enabled: true }));
  await expect(saveWellnessReminder(actor, false, '09:15')).rejects.toThrow('INVALID_REMINDER_RESPONSE');
});
it('the shared deadline covers a hanging session check and does not send a late request', async () => {
  vi.useFakeTimers();
  let resolve!: (value: Awaited<ReturnType<typeof supabase.auth.getSession>>) => void;
  vi.mocked(supabase.auth.getSession).mockImplementationOnce(() => new Promise(yes => { resolve = yes; }));
  const result = getPushDevice(actor, device);
  const assertion = expect(result).rejects.toThrow('NOTIFICATION_REQUEST_TIMEOUT');
  await vi.advanceTimersByTimeAsync(NOTIFICATION_REQUEST_TIMEOUT_MS); await assertion;
  resolve({ data: { session: { user: { id: actor }, access_token: 'late-token' } as Session }, error: null });
  await vi.runAllTimersAsync(); expect(mock.network).not.toHaveBeenCalled();
});
it('a hanging save is bounded and aborted without pretending its outcome is known', async () => {
  vi.useFakeTimers(); mock.network.mockImplementation(() => new Promise(() => {}));
  const result = saveWellnessReminder(actor, false, '09:15');
  const assertion = expect(result).rejects.toThrow('NOTIFICATION_REQUEST_TIMEOUT');
  await vi.advanceTimersByTimeAsync(NOTIFICATION_REQUEST_TIMEOUT_MS); await assertion;
  expect(mock.network.mock.calls[0][1].signal.aborted).toBe(true);
});
it('caller abort cancels the shared deadline while a session check is still pending', async () => {
  vi.mocked(supabase.auth.getSession).mockImplementationOnce(() => new Promise(() => {}));
  const controller = new AbortController(); const result = getPushDevice(actor, device, controller.signal);
  controller.abort(new DOMException('Screen closed', 'AbortError'));
  await expect(result).rejects.toMatchObject({ name: 'AbortError' }); expect(mock.network).not.toHaveBeenCalled();
});
it('the same deadline includes post-response account verification', async () => {
  vi.useFakeTimers(); mock.network.mockResolvedValue(response(reminderResponse));
  let calls = 0;
  vi.mocked(supabase.auth.getSession).mockImplementation(() => {
    calls++;
    if (calls >= 3) return new Promise(() => {}); // checked session, SDK session, post-response check
    return Promise.resolve({ data: { session: { user: { id: actor }, access_token: 'fixture-token' } as Session }, error: null });
  });
  const result = getWellnessReminder(actor); const assertion = expect(result).rejects.toThrow('NOTIFICATION_REQUEST_TIMEOUT');
  await vi.advanceTimersByTimeAsync(NOTIFICATION_REQUEST_TIMEOUT_MS); await assertion;
  expect(mock.network).toHaveBeenCalledOnce();
});

it('a diagnostic sends only the exact device and stable command ID; lookup exposes safe service acceptance only', async () => {
  const receipt = { commandId: subscription, deviceId: device, jobId: actor };
  mock.network.mockResolvedValueOnce(response(receipt)).mockResolvedValueOnce(response(receipt))
    .mockResolvedValueOnce(response({ ...receipt, status: 'acceptedByPushService' }));
  expect(await requestPushTest(actor, device, subscription)).toEqual(receipt);
  expect(await requestPushTest(actor, device, subscription)).toEqual(receipt);
  const first = JSON.parse(mock.network.mock.calls[0][1].body);
  expect(first).toEqual({ p_device_id: device, p_command_id: subscription });
  expect(JSON.parse(mock.network.mock.calls[1][1].body)).toEqual(first);
  expect((await getPushTest(actor, subscription))?.status).toBe('acceptedByPushService');
  expect(JSON.parse(mock.network.mock.calls[2][1].body)).toEqual({ p_command_id: subscription });
});
it('a diagnostic rejects altered receipt identity, unknown delivery claims and leaked endpoint fields', async () => {
  const receipt = { commandId: subscription, deviceId: device, jobId: actor };
  mock.network.mockResolvedValueOnce(response({ ...receipt, deviceId: actor }))
    .mockResolvedValueOnce(response({ ...receipt, commandId: actor, status: 'queued' }))
    .mockResolvedValueOnce(response({ ...receipt, status: 'delivered' }))
    .mockResolvedValueOnce(response({ ...receipt, status: 'queued', endpoint: 'https://fcm.googleapis.com/private' }));
  await expect(requestPushTest(actor, device, subscription)).rejects.toThrow('INVALID_PUSH_TEST_RESPONSE');
  await expect(getPushTest(actor, subscription)).rejects.toThrow('INVALID_PUSH_TEST_RESPONSE');
  await expect(getPushTest(actor, subscription)).rejects.toThrow();
  await expect(getPushTest(actor, subscription)).rejects.toThrow();
});
it('a lost diagnostic response retains the exact retry identity and absence is not represented as delivery', async () => {
  mock.network.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'temporary outage' }), { status: 503 }))
    .mockResolvedValueOnce(response(null))
    .mockResolvedValueOnce(response({ commandId: subscription, deviceId: device, jobId: actor }));
  await expect(requestPushTest(actor, device, subscription)).rejects.toThrow('temporary outage');
  expect(await getPushTest(actor, subscription)).toBeNull();
  await requestPushTest(actor, device, subscription);
  expect(mock.network.mock.calls[0][1].body).toBe(mock.network.mock.calls[2][1].body);
});
