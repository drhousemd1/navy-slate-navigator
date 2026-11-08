// This test creates ephemeral cryptographic material only. It neither reads
// configured credentials nor calls sendNotification/fetch. Run against cached,
// frozen dependencies with network denied. The library's only allowed environment
// read is ECE_KEYLOG, explicitly fixed to 0 to disable its diagnostic key logging.
// @deno-types="npm:@types/web-push@3.6.4"
import webpush from 'npm:web-push@3.6.7';
import { createECDH, randomBytes } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { normalizeVapidPrivateKey } from './vapid-keys.ts';

function assert(value: boolean, message: string): asserts value {
  if (!value) throw new Error(message);
}

Deno.test('pinned Web Push encrypts with the original PKCS8 encoding under Deno without sending it', async () => {
  const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const publicKey = Buffer.from(await crypto.subtle.exportKey('raw', keys.publicKey)).toString('base64url');
  const storedPrivateKey = Buffer.from(await crypto.subtle.exportKey('pkcs8', keys.privateKey)).toString('base64url');
  const vapid = { publicKey, privateKey: await normalizeVapidPrivateKey(publicKey, storedPrivateKey) };
  const recipient = createECDH('prime256v1');
  recipient.generateKeys();
  const endpoint = 'https://fcm.googleapis.com/fcm/send/synthetic-offline-only';
  const payload = JSON.stringify({ version: 1,
    notificationId: '10000000-0000-4000-8000-000000000001',
    title: 'Navy Slate Navigator', body: 'Your activity has an update.', url: '/tasks' });
  const prepared = webpush.generateRequestDetails({ endpoint,
    keys: { p256dh: recipient.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') },
  }, payload, { vapidDetails: { ...vapid, subject: 'mailto:synthetic@example.invalid' },
    contentEncoding: 'aes128gcm', TTL: 60, urgency: 'normal' });

  assert(prepared.endpoint === endpoint && prepared.method === 'POST', 'Unexpected prepared destination or method');
  assert(prepared.headers['Content-Encoding'] === 'aes128gcm', 'Expected standard Web Push encryption');
  assert(prepared.headers['Content-Type'] === 'application/octet-stream', 'Expected binary encrypted content');
  assert(String(prepared.headers.TTL) === '60', 'Expected bounded delivery lifetime');
  assert(/^vapid t=.+, k=.+$/.test(String(prepared.headers.Authorization)), 'Expected VAPID authorization');
  assert(prepared.body.byteLength > 0, 'Missing encrypted body');
  assert(!prepared.body.includes(Buffer.from(payload)), 'The payload must not be present as plaintext');
});
