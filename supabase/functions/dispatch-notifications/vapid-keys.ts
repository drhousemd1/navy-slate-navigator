/** Accept the app's original WebCrypto PKCS8 export and raw Web Push scalars.
 * Normalize only in worker memory: never rotate, persist, log or return a key.
 * Every accepted private key must prove possession of the configured public key. */
function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decode(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length > 1024) throw new Error();
  const bytes = Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)), c => c.charCodeAt(0));
  if (encode(bytes) !== value) throw new Error();
  return bytes;
}

export async function normalizeVapidPrivateKey(publicKey: string, storedPrivateKey: string): Promise<string> {
  try {
    const publicBytes = decode(publicKey), privateBytes = decode(storedPrivateKey);
    if (publicBytes.length !== 65 || publicBytes[0] !== 4) throw new Error();
    const algorithm = { name: 'ECDSA', namedCurve: 'P-256' };
    const verifier = await crypto.subtle.importKey('raw', publicBytes, algorithm, false, ['verify']);
    const x = encode(publicBytes.slice(1, 33)), y = encode(publicBytes.slice(33, 65));
    const signer = privateBytes.length === 32
      ? await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x, y, d: storedPrivateKey }, algorithm, true, ['sign'])
      : await crypto.subtle.importKey('pkcs8', privateBytes, algorithm, true, ['sign']);
    const jwk = await crypto.subtle.exportKey('jwk', signer);
    if (jwk.kty !== 'EC' || jwk.crv !== 'P-256' || jwk.x !== x || jwk.y !== y ||
        typeof jwk.d !== 'string' || decode(jwk.d).length !== 32) throw new Error();
    // Do not trust a JWK's supplied public coordinates alone: prove d matches.
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signer, challenge);
    if (!await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, verifier, signature, challenge)) throw new Error();
    return jwk.d;
  } catch {
    // Provider exceptions and input material must never reach logs/responses.
    throw new Error('Invalid or mismatched VAPID key configuration');
  }
}
