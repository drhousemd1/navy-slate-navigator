/** Pure orchestration boundary: tests inject RPC and encryption, never a push
 * endpoint or live credential. Only SQL's prepared jobs supply recipient data. */
export interface PushSubscriptionData { endpoint: string; keys: { p256dh: string; auth: string } }
export interface PushPayload { version: 1; notificationId: string; title: 'Navy Slate Navigator'; body: string; url: string }
export interface PushRequest { endpoint: string; headers: Record<string, string>; body: Uint8Array }
export interface NotificationControl {
  configuration(): Promise<{ delivery_enabled: boolean; vapid_key_id: string | null }>;
  rpc(name: string, args?: Record<string, unknown>): Promise<unknown>;
}
export interface DispatcherOptions {
  workerSecret: string;
  vapidKeyId: string;
  control: NotificationControl;
  encrypt(subscription: PushSubscriptionData, payload: PushPayload, ttl: number): Promise<PushRequest> | PushRequest;
  fetch?: typeof fetch;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const routes = new Set(['/messages', '/wellbeing', '/tasks', '/rules', '/punishments', '/rewards', '/notifications']);
const bodies = new Set(['You have a new message.', 'It is time for your wellbeing check-in.', 'Your activity has an update.', 'This is your requested device notification test.']);
export function validPushEndpoint(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 30 && value.length <= 2048 &&
    /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.apple\.com)\/[A-Za-z0-9_~./?=&%+-]+$/.test(value);
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid worker response');
  return value as Record<string, unknown>;
}
function readyDelivery(value: unknown, deliveryId: string, keyId: string) {
  const row = record(value), subscription = record(row.subscription), keys = record(subscription.keys), payload = record(row.payload);
  if (row.status !== 'ready' || row.vapidKeyId !== keyId || !validPushEndpoint(subscription.endpoint) ||
    typeof keys.p256dh !== 'string' || !/^[A-Za-z0-9_-]{87}$/.test(keys.p256dh) ||
    typeof keys.auth !== 'string' || !/^[A-Za-z0-9_-]{22}$/.test(keys.auth) ||
    !Number.isInteger(row.ttl) || Number(row.ttl) < 1 || Number(row.ttl) > 3600 ||
    payload.version !== 1 || payload.notificationId !== deliveryId || payload.title !== 'Navy Slate Navigator' ||
    typeof payload.body !== 'string' || !bodies.has(payload.body) || typeof payload.url !== 'string' || !routes.has(payload.url)) {
    throw new Error('Invalid prepared notification');
  }
  // Rebuild the payload: unknown fields never leak caller or source data.
  return { subscription: { endpoint: subscription.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
    ttl: Number(row.ttl), payload: { version: 1, notificationId: deliveryId, title: 'Navy Slate Navigator', body: payload.body, url: payload.url } as PushPayload };
}
export function pushOutcome(status: number): 'accepted' | 'invalid_endpoint' | 'permanent_failure' | 'retryable' {
  if (status >= 200 && status < 300) return 'accepted';
  if (status === 404 || status === 410) return 'invalid_endpoint';
  if (status === 400 || status === 413) return 'permanent_failure';
  return 'retryable'; // includes key/service failures: do not delete a valid device
}
function authorized(actual: string | null, secret: string): boolean {
  const expected = `Bearer ${secret}`;
  if (secret.length < 32 || !actual || actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index++) difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
export function createNotificationDispatcher(options: DispatcherOptions) {
  const request = options.fetch ?? fetch;
  return async (incoming: Request): Promise<Response> => {
    if (!authorized(incoming.headers.get('Authorization'), options.workerSecret)) return json({ error: 'Unauthorized' }, 401);
    if (incoming.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    try {
      const text = await incoming.text();
      if (text.length > 100 || (text && Object.keys(record(JSON.parse(text))).length !== 0)) return json({ error: 'No recipient or payload arguments are accepted' }, 400);
    } catch { return json({ error: 'Invalid request' }, 400); }
    const summary = { acceptedByPushService: 0, skipped: 0, retryable: 0, permanentFailure: 0, confirmationUnknown: 0 };
    try {
      const configuration = await options.control.configuration();
      if (!configuration.delivery_enabled) return json({ status: 'disabled', ...summary });
      if (configuration.vapid_key_id !== options.vapidKeyId) return json({ error: 'Push key configuration mismatch' }, 503);
      await options.control.rpc('enqueue_due_wellness_reminders');
      const claims = await options.control.rpc('claim_notification_deliveries', { p_limit: 5 });
      if (!Array.isArray(claims) || claims.length > 5) throw new Error('Invalid claims');
      for (const value of claims) {
        const claim = record(value);
        if (typeof claim.deliveryId !== 'string' || !uuid.test(claim.deliveryId) || typeof claim.leaseToken !== 'string' || !uuid.test(claim.leaseToken)) throw new Error('Invalid lease');
        const lease = { p_delivery_id: claim.deliveryId, p_lease_token: claim.leaseToken };
        let outcome: ReturnType<typeof pushOutcome> = 'retryable', httpStatus: number | null = null;
        try {
          const prepared = await options.control.rpc('prepare_notification_delivery', lease);
          if (record(prepared).status === 'skipped') { summary.skipped++; continue; }
          const { subscription, payload, ttl } = readyDelivery(prepared, claim.deliveryId, options.vapidKeyId);
          const encrypted = await options.encrypt(subscription, payload, ttl);
          if (encrypted.endpoint !== subscription.endpoint || !validPushEndpoint(encrypted.endpoint) ||
            encrypted.headers['Content-Encoding'] !== 'aes128gcm' || encrypted.body.byteLength === 0) throw new Error('Invalid encrypted request');
          const response = await request(encrypted.endpoint, { method: 'POST', headers: encrypted.headers,
            body: encrypted.body as BodyInit, redirect: 'error', signal: AbortSignal.timeout(8000) });
          httpStatus = response.status; outcome = pushOutcome(httpStatus);
          await response.body?.cancel(); // never log provider response, endpoints or encrypted payload
        } catch { /* Transport/config uncertainty retains this exact delivery. */ }
        try {
          const recorded = await options.control.rpc('finish_notification_delivery', { ...lease, p_outcome: outcome, p_http_status: httpStatus });
          if (recorded !== true) { summary.confirmationUnknown++; continue; }
          if (outcome === 'accepted') summary.acceptedByPushService++;
          else if (outcome === 'retryable') summary.retryable++;
          else summary.permanentFailure++;
        } catch { summary.confirmationUnknown++; }
      }
      return json({ status: 'processed', ...summary }, summary.confirmationUnknown ? 202 : 200);
    } catch { return json({ error: 'Notification processing could not be confirmed', ...summary }, 503); }
  };
}

export function createRestNotificationControl(url: string, serviceKey: string, request: typeof fetch = fetch): NotificationControl {
  const base = new URL(url);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.pathname !== '/') throw new Error('Invalid backend URL');
  async function call(path: string, body?: unknown) {
    const response = await request(new URL(path, base), { method: body === undefined ? 'GET' : 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(5000) });
    if (!response.ok) { await response.body?.cancel(); throw new Error('Notification control unavailable'); }
    return await response.json();
  }
  return {
    async configuration() {
      const rows = await call('/rest/v1/notification_configuration?select=delivery_enabled,vapid_key_id&singleton=eq.true');
      if (!Array.isArray(rows) || rows.length !== 1 || typeof rows[0].delivery_enabled !== 'boolean') throw new Error('Missing configuration');
      return rows[0];
    },
    rpc(name, args = {}) {
      if (!['enqueue_due_wellness_reminders', 'claim_notification_deliveries', 'prepare_notification_delivery', 'finish_notification_delivery'].includes(name)) throw new Error('Unexpected worker operation');
      return call(`/rest/v1/rpc/${name}`, args);
    },
  };
}
