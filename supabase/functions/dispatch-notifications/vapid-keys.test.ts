import { normalizeVapidPrivateKey } from './vapid-keys.ts';

const encode = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function assert(value: boolean, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function pair(curve = 'P-256') {
  const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: curve }, true, ['sign', 'verify']);
  return { publicKey: encode(await crypto.subtle.exportKey('raw', keys.publicKey)),
    pkcs8: encode(await crypto.subtle.exportKey('pkcs8', keys.privateKey)),
    scalar: (await crypto.subtle.exportKey('jwk', keys.privateKey)).d! };
}
async function rejects(publicKey: string, privateKey: string) {
  try { await normalizeVapidPrivateKey(publicKey, privateKey); }
  catch (error) {
    assert(error instanceof Error && error.message === 'Invalid or mismatched VAPID key configuration', 'Expected sanitized configuration error');
    return;
  }
  throw new Error('Invalid key was accepted');
}

Deno.test('original PKCS8 and raw scalar preserve the exact public/private pair', async () => {
  const keys = await pair();
  assert(keys.publicKey.length === 87 && keys.scalar.length === 43 && keys.pkcs8.length > 43, 'Unexpected ephemeral encodings');
  assert(await normalizeVapidPrivateKey(keys.publicKey, keys.pkcs8) === keys.scalar, 'PKCS8 changed the scalar');
  assert(await normalizeVapidPrivateKey(keys.publicKey, keys.scalar) === keys.scalar, 'Raw key changed');
});
Deno.test('both encodings reject another public key rather than rotate subscriptions', async () => {
  const a = await pair(), b = await pair();
  await rejects(a.publicKey, b.pkcs8);
  await rejects(a.publicKey, b.scalar);
});
Deno.test('reject malformed, noncanonical, zero, invalid curve and invalid public keys without exposing values', async () => {
  const a = await pair(), otherCurve = await pair('P-384');
  for (const invalid of ['', 'not a key', a.scalar + '=', a.pkcs8 + '=', a.scalar.slice(0, -1),
    encode(new Uint8Array(32).buffer), 'A'.repeat(1500), otherCurve.pkcs8]) await rejects(a.publicKey, invalid);
  await rejects(a.publicKey + '=', a.scalar);
  await rejects(encode(new Uint8Array(65).buffer), a.scalar);
  await rejects(otherCurve.publicKey, otherCurve.scalar);
});
