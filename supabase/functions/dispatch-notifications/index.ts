// @deno-types="npm:@types/web-push@3.6.4"
import webpush from 'npm:web-push@3.6.7';
import { createNotificationDispatcher, createRestNotificationControl } from './handler.ts';
import { normalizeVapidPrivateKey } from './vapid-keys.ts';
const required = (name: string) => { const value = Deno.env.get(name); if (!value) throw new Error(`Missing ${name}`); return value; };
const publicKey = required('VAPID_PUBLIC_KEY');
// Preserve the stored key and public subscriptions. The old app exported PKCS8;
// Web Push needs its raw scalar. Validate the pair and normalize only in memory.
const privateKey = await normalizeVapidPrivateKey(publicKey, required('VAPID_PRIVATE_KEY'));
const vapidKeyId = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(publicKey)))].map(x => x.toString(16).padStart(2, '0')).join('');
const subject = required('VAPID_SUBJECT');
if (!/^(mailto:|https:\/\/)/.test(subject)) throw new Error('Invalid VAPID subject');
Deno.serve(createNotificationDispatcher({
  workerSecret: required('NOTIFICATION_WORKER_SECRET'), vapidKeyId,
  control: createRestNotificationControl(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY')),
  encrypt(subscription, payload, ttl) {
    // Library owns standards-based payload encryption and VAPID signing. Fetch
    // remains bounded and redirect-disabled in the tested handler.
    const result = webpush.generateRequestDetails(subscription, JSON.stringify(payload), {
      vapidDetails: { subject, publicKey, privateKey }, contentEncoding: 'aes128gcm', TTL: ttl, urgency: 'normal',
    });
    return { endpoint: result.endpoint,
      headers: Object.fromEntries(Object.entries(result.headers).map(([name, value]) => [name, String(value)])),
      body: new Uint8Array(result.body) };
  },
}));
