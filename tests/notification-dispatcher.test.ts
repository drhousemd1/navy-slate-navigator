import { describe, expect, it, vi } from 'vitest';
import { createNotificationDispatcher, createRestNotificationControl, pushOutcome, validPushEndpoint } from '../supabase/functions/dispatch-notifications/handler';

const deliveryId = '10000000-0000-4000-8000-000000000001', leaseToken = '10000000-0000-4000-8000-000000000002';
const secret = 'synthetic-worker-secret-never-a-live-key', keyId = 'a'.repeat(64);
const endpoint = 'https://fcm.googleapis.com/fcm/send/synthetic-only';
const prepared = () => ({ status: 'ready', vapidKeyId: keyId, ttl: 60,
  subscription: { endpoint, keys: { p256dh: 'A'.repeat(87), auth: 'B'.repeat(22) } },
  payload: { version: 1, notificationId: deliveryId, title: 'Navy Slate Navigator', body: 'You have a new message.', url: '/messages' } });
function fixture() {
  const rpc = vi.fn(async (name: string, _args?: Record<string, unknown>): Promise<unknown> => {
    if (name === 'claim_notification_deliveries') return [{ deliveryId, leaseToken }];
    if (name === 'prepare_notification_delivery') return prepared();
    return true;
  });
  const configuration = vi.fn(async () => ({ delivery_enabled: true, vapid_key_id: keyId }));
  const encrypt = vi.fn(() => ({ endpoint, headers: { 'Content-Encoding': 'aes128gcm' }, body: new Uint8Array([1, 2, 3]) }));
  const fetch = vi.fn(async () => new Response(null, { status: 201 }));
  const handler = createNotificationDispatcher({ workerSecret: secret, vapidKeyId: keyId, control: { rpc, configuration }, encrypt, fetch });
  const send = (auth = `Bearer ${secret}`, body = '{}', method = 'POST') => handler(new Request('https://worker.example.invalid/', {
    method, headers: { Authorization: auth }, ...(method === 'POST' ? { body } : {}),
  }));
  return { rpc, configuration, encrypt, fetch, send };
}
describe('trusted push worker', () => {
  it('rejects unauthenticated callers and caller-chosen recipient/body without touching the backend', async () => {
    const f = fixture();
    expect((await f.send('Bearer publishable-key')).status).toBe(401);
    expect((await f.send(undefined, JSON.stringify({ senderId: deliveryId, body: 'private' }))).status).toBe(400);
    expect((await f.send(undefined, '{}', 'GET')).status).toBe(405);
    expect(f.rpc).not.toHaveBeenCalled(); expect(f.configuration).not.toHaveBeenCalled();
  });
  it('does nothing while delivery is disabled or the public-key identity differs', async () => {
    const f = fixture(); f.configuration.mockResolvedValueOnce({ delivery_enabled: false, vapid_key_id: keyId });
    expect(await (await f.send()).json()).toMatchObject({ status: 'disabled', acceptedByPushService: 0 });
    f.configuration.mockResolvedValueOnce({ delivery_enabled: true, vapid_key_id: 'b'.repeat(64) });
    expect((await f.send()).status).toBe(503); expect(f.rpc).not.toHaveBeenCalled();
  });
  it('sends only the rebuilt private payload and records push-service acceptance separately', async () => {
    const f = fixture();
    f.rpc.mockImplementation(async name => name === 'claim_notification_deliveries' ? [{ deliveryId, leaseToken }] :
      name === 'prepare_notification_delivery' ? { ...prepared(), payload: { ...prepared().payload, secret: 'must not escape' } } : true);
    expect(await (await f.send()).json()).toMatchObject({ acceptedByPushService: 1, confirmationUnknown: 0 });
    expect(f.encrypt.mock.calls[0][1]).toEqual(prepared().payload);
    expect(f.fetch).toHaveBeenCalledWith(endpoint, expect.objectContaining({ redirect: 'error', method: 'POST' }));
    expect(f.rpc).toHaveBeenLastCalledWith('finish_notification_delivery', {
      p_delivery_id: deliveryId, p_lease_token: leaseToken, p_outcome: 'accepted', p_http_status: 201,
    });
  });
  it('uses the prepared fixed diagnostic content without accepting a caller test body', async () => {
    const f = fixture();
    const payload = { ...prepared().payload, body: 'This is your requested device notification test.', url: '/notifications' };
    f.rpc.mockImplementation(async name => name === 'claim_notification_deliveries' ? [{ deliveryId, leaseToken }] :
      name === 'prepare_notification_delivery' ? { ...prepared(), payload } : true);
    expect(await (await f.send()).json()).toMatchObject({ acceptedByPushService: 1 });
    expect(f.encrypt.mock.calls[0][1]).toEqual(payload);
  });
  it('does not send when recipient preferences or connection verification skip the prepared attempt', async () => {
    const f = fixture();
    f.rpc.mockImplementation(async name => name === 'claim_notification_deliveries' ? [{ deliveryId, leaseToken }] : { status: 'skipped', reason: 'connection_changed' });
    expect(await (await f.send()).json()).toMatchObject({ skipped: 1 });
    expect(f.fetch).not.toHaveBeenCalled(); expect(f.encrypt).not.toHaveBeenCalled();
  });
  it.each([404, 410, 429, 500, 401, 400])('records HTTP %s without treating every 200-style function result as delivery', async status => {
    const f = fixture(); f.fetch.mockResolvedValue(new Response(null, { status }));
    await f.send();
    expect(f.rpc).toHaveBeenLastCalledWith('finish_notification_delivery', expect.objectContaining({ p_outcome: pushOutcome(status), p_http_status: status }));
  });
  it('loss of the provider response retains the same delivery and lease for retry', async () => {
    const f = fixture(); f.fetch.mockRejectedValue(new TypeError('unreachable'));
    expect(await (await f.send()).json()).toMatchObject({ retryable: 1, acceptedByPushService: 0 });
    expect(f.rpc).toHaveBeenLastCalledWith('finish_notification_delivery', { p_delivery_id: deliveryId, p_lease_token: leaseToken, p_outcome: 'retryable', p_http_status: null });
  });
  it('loss of the durable completion result does not claim confirmed delivery', async () => {
    const f = fixture();
    f.rpc.mockImplementation(async name => {
      if (name === 'claim_notification_deliveries') return [{ deliveryId, leaseToken }];
      if (name === 'prepare_notification_delivery') return prepared();
      if (name === 'finish_notification_delivery') throw new Error('response lost');
      return true;
    });
    const response = await f.send(); expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ confirmationUnknown: 1, acceptedByPushService: 0 });
  });
  it.each([
    { subscription: { ...prepared().subscription, endpoint: 'http://127.0.0.1/private' } },
    { payload: { ...prepared().payload, body: 'untrusted intimate preview' } },
    { payload: { ...prepared().payload, url: 'https://example.invalid/steal' } },
    { payload: { ...prepared().payload, notificationId: leaseToken } },
    { vapidKeyId: 'b'.repeat(64) },
  ])('never contacts an unsafe endpoint or displays an unvalidated payload', async patch => {
    const f = fixture();
    f.rpc.mockImplementation(async name => name === 'claim_notification_deliveries' ? [{ deliveryId, leaseToken }] : name === 'prepare_notification_delivery' ? { ...prepared(), ...patch } : true);
    await f.send(); expect(f.fetch).not.toHaveBeenCalled(); expect(f.encrypt).not.toHaveBeenCalled();
  });
  it('rejects arbitrary RPC paths in the service-key adapter', () => {
    const request = vi.fn(); const control = createRestNotificationControl('https://backend.example.invalid', 'synthetic-service-only', request);
    expect(() => control.rpc('../arbitrary')).toThrow(); expect(request).not.toHaveBeenCalled();
  });
});
describe('push destination restrictions', () => {
  it.each(['https://web.push.apple.com/Qsynthetic', 'https://updates.push.services.mozilla.com/wpush/v2/synthetic', endpoint])('permits supported provider %s', value => expect(validPushEndpoint(value)).toBe(true));
  it.each(['https://fcm.googleapis.com.attacker.invalid/path', 'https://fcm.googleapis.com@127.0.0.1/path',
    'https://127.0.0.1/path', 'http://fcm.googleapis.com/path', 'https://fcm.googleapis.com:8443/path',
    'https://web.push.apple.com/path#fragment', 'https://example.invalid/push'])('rejects unsafe provider %s', value => expect(validPushEndpoint(value)).toBe(false));
});
