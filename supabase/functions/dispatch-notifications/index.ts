// @deno-types="npm:@types/web-push@3.6.4"
import webpush from 'npm:web-push@3.6.7';
import { createNotificationDispatcher, createRestNotificationControl } from './handler.ts';
const required = (name: string) => { const value = Deno.env.get(name); if (!value) throw new Error(`Missing ${name}`); return value; };
const publicKey = required('VAPID_PUBLIC_KEY'), privateKey = required('VAPID_PRIVATE_KEY');
// This library requires raw URL-safe VAPID keys. Do not silently reuse an unknown
// legacy PKCS8 representation, rotate secrets, or generate keys at request time.
if (!/^[A-Za-z0-9_-]{87}$/.test(publicKey) || !/^[A-Za-z0-9_-]{43}$/.test(privateKey)) throw new Error('Unsupported VAPID key format');
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
