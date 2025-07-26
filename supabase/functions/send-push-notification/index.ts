import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
}

/* ================= BASE64 HELPERS ================= */
function b64urlToBytes(input: string): Uint8Array {
  if (!input) throw new Error("Empty base64 input");
  let b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? 4 - (b64.length % 4) : 0;
  b64 += "=".repeat(pad);
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
function bytesToB64url(bytes: Uint8Array): string {
  const bin = String.fromCharCode(...bytes);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/,"");
}

/* ================= SIGNATURE NORMALIZER (DER or RAW) ================= */
// Accepts either DER (starts 0x30) or raw 64-byte r||s. Returns base64url(r||s).
function signatureToJose(sig: Uint8Array): string {
  // RAW path
  if (sig.length === 64 && sig[0] !== 0x30) {
    console.log("[SIG] Detected raw 64-byte signature");
    return bytesToB64url(sig);
  }
  // DER path
  console.log("[SIG] Attempting DER parse, length:", sig.length);
  if (sig[0] !== 0x30) throw new Error("Invalid signature: neither raw(64) nor DER(0x30)");
  let offset = 1;
  let seqLen = sig[offset++];
  if (seqLen & 0x80) {
    const n = seqLen & 0x7f;
    if (n === 0 || n > 2) throw new Error("Invalid DER: bad length");
    seqLen = 0;
    for (let i=0;i<n;i++) seqLen = (seqLen<<8) | sig[offset++];
  }
  if (sig[offset++] !== 0x02) throw new Error("Invalid DER: missing INTEGER r");
  const rLen = sig[offset++]; const r = sig.slice(offset, offset+rLen); offset += rLen;
  if (sig[offset++] !== 0x02) throw new Error("Invalid DER: missing INTEGER s");
  const sLen = sig[offset++]; const s = sig.slice(offset, offset+sLen);

  const normalize = (buf: Uint8Array) => {
    let b = buf[0] === 0x00 ? buf.slice(1) : buf;
    if (b.length > 32) throw new Error("Invalid DER: component >32");
    const out = new Uint8Array(32); out.set(b, 32 - b.length);
    return out;
  };
  const rOut = normalize(r);
  const sOut = normalize(s);
  const raw = new Uint8Array(64);
  raw.set(rOut,0); raw.set(sOut,32);
  return bytesToB64url(raw);
}

/* ================= VAPID JWT BUILDER (FIXED FOR APPLE) ================= */
async function buildVapidJWT(endpoint: string, userEmail: string) {
  console.log("--- VAPID JWT BUILD START ---");
  const pubKeyB64 = Deno.env.get("VAPID_PUBLIC_KEY");
  const privKeyB64 = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!pubKeyB64 || !privKeyB64) throw new Error("Missing VAPID env vars");

  console.log("[VAPID] Raw key lengths - Public:", pubKeyB64.length, "Private:", privKeyB64.length);

  try {
    // Try to import as PKCS8 private key first (new format)
    const privBytes = b64urlToBytes(privKeyB64);
    console.log("[VAPID] Attempting PKCS8 import, private key bytes:", privBytes.length);
    
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      privBytes,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );
    console.log("[VAPID] PKCS8 private key import successful");

    // For public key, check if it's raw format or needs conversion
    const pubBytes = b64urlToBytes(pubKeyB64);
    console.log("[VAPID] Public key bytes:", pubBytes.length, "first byte:", pubBytes[0]?.toString(16));
    
    let vapidPublicKeyForHeader: string;
    if (pubBytes.length === 65 && pubBytes[0] === 0x04) {
      // Raw uncompressed format, use as-is
      vapidPublicKeyForHeader = pubKeyB64;
      console.log("[VAPID] Using raw public key format");
    } else {
      throw new Error("Public key must be 65 bytes in uncompressed format (starting with 0x04)");
    }

    // Dynamic audience based on endpoint
    let aud: string;
    if (endpoint.includes("fcm.googleapis.com") || endpoint.includes("android.googleapis.com")) {
      aud = "https://fcm.googleapis.com";
      console.log("[VAPID] Using Google FCM audience");
    } else if (endpoint.includes("web.push.apple.com")) {
      aud = "https://web.push.apple.com";
      console.log("[VAPID] Using Apple Push audience");
    } else if (endpoint.includes("push.mozilla.org")) {
      aud = "https://push.mozilla.org";
      console.log("[VAPID] Using Mozilla Push audience");
    } else {
      // Extract origin from endpoint
      try {
        const url = new URL(endpoint);
        aud = `${url.protocol}//${url.hostname}`;
        console.log("[VAPID] Using extracted audience:", aud);
      } catch {
        aud = "https://web.push.apple.com";
        console.log("[VAPID] Fallback to Apple audience");
      }
    }

    const exp = Math.floor(Date.now()/1000) + 12*60*60;
    const header = bytesToB64url(new TextEncoder().encode(JSON.stringify({alg:"ES256",typ:"JWT"})));
    // Use dynamic user email for Apple compliance
    const payload = bytesToB64url(new TextEncoder().encode(JSON.stringify({
      aud,
      exp,
      sub: "mailto:" + userEmail
    })));
    const signingInput = `${header}.${payload}`;

    console.log("[VAPID] Signing JWT with PKCS8 key...");
    const sigBytes = new Uint8Array(await crypto.subtle.sign(
      {name:"ECDSA", hash:"SHA-256"},
      privateKey,
      new TextEncoder().encode(signingInput)
    ));
    console.log("[VAPID] sign() returned length:", sigBytes.length, "firstByte:", sigBytes[0]);

    const signature = signatureToJose(sigBytes);
    const jwt = `${signingInput}.${signature}`;
    console.log("[VAPID] JWT built successfully, length:", jwt.length);
    return { jwt, publicKey: vapidPublicKeyForHeader };

  } catch (error) {
    console.error("[VAPID] PKCS8 import failed, error:", error);
    
    // Fallback to old JWK method if PKCS8 fails
    console.log("[VAPID] Falling back to JWK import method...");
    const pubBytes = b64urlToBytes(pubKeyB64);
    const privBytes = b64urlToBytes(privKeyB64);
    
    if (pubBytes.length !== 65 || pubBytes[0] !== 0x04) throw new Error("Public key must be 65 bytes starting 0x04");
    if (privBytes.length !== 32) throw new Error("Private key must be 32 bytes for JWK");

    const x = bytesToB64url(pubBytes.slice(1,33));
    const y = bytesToB64url(pubBytes.slice(33,65));
    const d = privKeyB64.replace(/=/g,"");

    const key = await crypto.subtle.importKey(
      "jwk",
      { kty:"EC", crv:"P-256", d, x, y, ext:true },
      { name:"ECDSA", namedCurve:"P-256" },
      false,
      ["sign"]
    );
    console.log("[VAPID] JWK importKey OK");

    // Same audience logic and signing as above
    let aud: string;
    if (endpoint.includes("fcm.googleapis.com") || endpoint.includes("android.googleapis.com")) {
      aud = "https://fcm.googleapis.com";
    } else if (endpoint.includes("web.push.apple.com")) {
      aud = "https://web.push.apple.com";
    } else if (endpoint.includes("push.mozilla.org")) {
      aud = "https://push.mozilla.org";
    } else {
      try {
        const url = new URL(endpoint);
        aud = `${url.protocol}//${url.hostname}`;
      } catch {
        aud = "https://web.push.apple.com";
      }
    }

    const exp = Math.floor(Date.now()/1000) + 12*60*60;
    const header = bytesToB64url(new TextEncoder().encode(JSON.stringify({alg:"ES256",typ:"JWT"})));
    const payload = bytesToB64url(new TextEncoder().encode(JSON.stringify({
      aud,
      exp,
      sub: "mailto:" + userEmail
    })));
    const signingInput = `${header}.${payload}`;

    const sigBytes = new Uint8Array(await crypto.subtle.sign(
      {name:"ECDSA", hash:"SHA-256"},
      key,
      new TextEncoder().encode(signingInput)
    ));

    const signature = signatureToJose(sigBytes);
    const jwt = `${signingInput}.${signature}`;
    console.log("[VAPID] JWT built with JWK fallback, length:", jwt.length);
    return { jwt, publicKey: pubKeyB64 };
  }
}

/* ================= WEB PUSH ENCRYPTION ================= */
async function generateKeys() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );
  
  const publicKey = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  
  return {
    publicKey: new Uint8Array(publicKey),
    privateKey: keyPair.privateKey,
    publicKeyBytes: new Uint8Array(publicKey)
  };
}

async function deriveEncryptionKeys(
  serverPrivateKey: CryptoKey,
  clientPublicKey: Uint8Array,
  auth: Uint8Array,
  salt: Uint8Array
) {
  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveKey(
    { name: "ECDH", public: clientKey },
    serverPrivateKey,
    { name: "HKDF", hash: "SHA-256" },
    false,
    ["deriveKey"]
  );

  // Create auth_info and key_info for HKDF (RFC 8291)
  const authInfo = new TextEncoder().encode("Content-Encoding: auth\0");
  const keyInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");

  // Derive auth key
  const authKey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: auth,
      info: authInfo
    },
    sharedSecret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Derive content encryption key
  const contentKey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt,
      info: keyInfo
    },
    sharedSecret,
    { name: "AES-GCM", length: 128 },
    false,
    ["encrypt"]
  );

  return { authKey, contentKey };
}

async function encryptPayload(
  payload: string,
  clientPublicKey: Uint8Array,
  auth: Uint8Array
): Promise<{
  encryptedData: Uint8Array;
  salt: Uint8Array;
  serverPublicKey: Uint8Array;
}> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const serverKeys = await generateKeys();
  
  const { contentKey } = await deriveEncryptionKeys(
    serverKeys.privateKey,
    clientPublicKey,
    auth,
    salt
  );

  // Use a 12-byte nonce (IV) for AES-GCM
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const payloadBuffer = new TextEncoder().encode(payload);
  
  // Add padding to payload (RFC 8291 requires padding)
  const paddingLength = 0; // Minimal padding for now
  const paddedPayload = new Uint8Array(payloadBuffer.length + paddingLength + 2);
  paddedPayload.set(payloadBuffer, 0);
  // Set padding length in last 2 bytes (big-endian)
  new DataView(paddedPayload.buffer).setUint16(paddedPayload.length - 2, paddingLength, false);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    contentKey,
    paddedPayload
  );

  // RFC 8291 format: salt(16) + record_size(4) + key_id_length(1) + key_id(65) + ciphertext
  const recordSize = 4096; // Standard record size
  const keyIdLength = serverKeys.publicKeyBytes.length;
  
  const result = new Uint8Array(16 + 4 + 1 + keyIdLength + encrypted.byteLength);
  let offset = 0;
  
  result.set(salt, offset); offset += 16;
  new DataView(result.buffer).setUint32(offset, recordSize, false); offset += 4;
  result[offset++] = keyIdLength;
  result.set(serverKeys.publicKeyBytes, offset); offset += keyIdLength;
  result.set(new Uint8Array(encrypted), offset);

  return {
    encryptedData: result,
    salt,
    serverPublicKey: serverKeys.publicKeyBytes
  };
}

/* ================= SEND RICH PUSH NOTIFICATION ================= */
async function sendPushNotification(
  endpoint: string, 
  payload: PushNotificationPayload,
  userEmail: string,
  clientPublicKey?: Uint8Array,
  auth?: Uint8Array
) {
  console.log("--- SEND PUSH NOTIFICATION START ---");
  console.log("[PUSH] Endpoint type:", endpoint.includes("fcm.googleapis.com") ? "FCM" : endpoint.includes("web.push.apple.com") ? "Apple" : "Other");
  console.log("[PUSH] Payload:", JSON.stringify(payload));
  
  const { jwt, publicKey: vapidPublicKey } = await buildVapidJWT(endpoint, userEmail);
  
  const headers: Record<string, string> = {
    "Authorization": `WebPush ${jwt}`,
    "TTL": "86400",
  };

  let body: Uint8Array | string = "";
  
  // If we have client keys, encrypt the payload
  if (clientPublicKey && auth && payload.title && payload.body) {
    try {
      const payloadJson = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/icons/icon-192.png",
        badge: payload.badge || "/icons/icon-192.png",
        data: payload.data || {}
      });
      
      const { encryptedData, salt, serverPublicKey } = await encryptPayload(
        payloadJson,
        clientPublicKey,
        auth
      );
      
      headers["Content-Type"] = "application/octet-stream";
      headers["Content-Encoding"] = "aes128gcm";
      headers["Crypto-Key"] = `dh=${bytesToB64url(serverPublicKey)};p256ecdsa=${vapidPublicKey}`;
      headers["Encryption"] = `salt=${bytesToB64url(salt)}`;
      
      body = encryptedData;
      console.log("[PUSH] Sending encrypted payload, size:", encryptedData.length);
    } catch (e) {
      console.error("[PUSH] Encryption failed, falling back to empty push:", e);
      headers["Crypto-Key"] = `p256ecdsa=${vapidPublicKey}`;
      body = "";
    }
  } else {
    // Fallback to empty push
    console.log("[PUSH] No client keys, sending empty push");
    headers["Crypto-Key"] = `p256ecdsa=${vapidPublicKey}`;
    body = "";
  }

  console.log("[PUSH] Headers:", JSON.stringify(headers, null, 2));
  
  const resp = await fetch(endpoint, {
    method: "POST",
    headers,
    body
  });
  
  const responseText = await resp.text().catch(() => "");
  console.log("[PUSH] Response status:", resp.status, "body:", responseText.slice(0, 200));
  
  // Handle subscription cleanup for invalid endpoints
  if (resp.status === 404 || resp.status === 410) {
    console.log("[PUSH] Endpoint invalid, should remove subscription");
    return { success: false, status: resp.status, shouldRemove: true };
  }
  
  if (resp.status >= 400) {
    throw new Error(`Push service HTTP ${resp.status}: ${responseText}`);
  }
  
  console.log("--- SEND PUSH NOTIFICATION END SUCCESS ---");
  return { success: true, status: resp.status };
}

/* ================= FALLBACK EMPTY PUSH ================= */
async function sendEmptyPush(endpoint: string, userEmail: string) {
  const emptyPayload: PushNotificationPayload = { title: "", body: "" };
  return sendPushNotification(endpoint, emptyPayload, userEmail);
}

/* ================= MAIN HANDLER ================= */
serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status:200, headers: CORS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error:"method not allowed" }, 405);
  }

  try {
    console.log("=== PUSH NOTIFICATION FUNCTION START ===");
    // Auth header required for invoke()
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      console.log("Missing/invalid Authorization header");
      return jsonResponse({ error:"unauthorized" }, 401);
    }

    // Parse body
    const body = await req.json().catch(()=> ({}));
    if (body.mode === "ping" && body.endpoint) {
      console.log("PING MODE DIRECT ENDPOINT TEST");
      await sendEmptyPush(body.endpoint, "test@example.com");
      return jsonResponse({ ok:true, mode:"ping" });
    }

    const targetUserId = body.targetUserId;
    const notifType = body.type;
    if (!targetUserId) {
      return jsonResponse({ error:"targetUserId required" }, 400);
    }

    // Create admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Fetch user's email from auth
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(targetUserId);
    if (userError) {
      console.error("Failed to fetch user email:", userError);
      return jsonResponse({ error: "failed to fetch user" }, 500);
    }
    
    const userEmail = userData.user?.email || "support@pushnotifications.app";
    console.log("[MAIN] Using email for VAPID:", userEmail);

    // Extract notification payload from request
    const notificationPayload: PushNotificationPayload = {
      title: body.title || "Notification",
      body: body.body || "You have a new notification",
      icon: body.icon || "/icons/icon-192.png",
      badge: body.badge || "/icons/icon-192.png",
      data: body.data || { type: notifType }
    };

    console.log("[MAIN] Extracted payload:", JSON.stringify(notificationPayload));

    // Look up subscriptions with encryption keys
    const { data: subs, error: subErr } = await admin
      .from("user_push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", targetUserId);

    if (subErr) {
      console.error("DB subscription error:", subErr);
      return jsonResponse({ error:"db error subscriptions" }, 500);
    }
    if (!subs || subs.length === 0) {
      console.log("No subscriptions for user:", targetUserId);
      return jsonResponse({ ok:false, reason:"no_subscriptions" }, 200);
    }

    // Optional: check notification preferences
    const { data: prefRow } = await admin
      .from("user_notification_preferences")
      .select("preferences")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (prefRow?.preferences?.enabled === false ||
        (prefRow?.preferences?.types && prefRow.preferences.types[notifType] === false)) {
      console.log("Notifications disabled for this type; skipping.");
      return jsonResponse({ ok:false, reason:"disabled" }, 200);
    }

    // Send rich push notification to each subscription
    let sentCount = 0;
    const subscriptionsToRemove: string[] = [];
    
    for (const sub of subs) {
      try {
        let clientPublicKey: Uint8Array | undefined;
        let auth: Uint8Array | undefined;
        
        // Try to decode encryption keys if available
        if (sub.p256dh && sub.auth) {
          try {
            clientPublicKey = b64urlToBytes(sub.p256dh);
            auth = b64urlToBytes(sub.auth);
            console.log("[MAIN] Using encryption for endpoint:", sub.endpoint.slice(0, 50) + "...");
          } catch (e) {
            console.warn("[MAIN] Failed to decode encryption keys:", e);
          }
        }
        
        const result = await sendPushNotification(
          sub.endpoint, 
          notificationPayload, 
          userEmail,
          clientPublicKey, 
          auth
        );
        
        if (result.shouldRemove) {
          subscriptionsToRemove.push(sub.endpoint);
        } else if (result.success) {
          sentCount++;
        }
      } catch (e) {
        console.error("Send failed for endpoint:", sub.endpoint.slice(0, 50) + "...", e);
        // Check if it's a 404/410 error indicating stale subscription
        if (e.message.includes("HTTP 404") || e.message.includes("HTTP 410")) {
          subscriptionsToRemove.push(sub.endpoint);
        }
      }
    }
    
    // Clean up stale subscriptions
    if (subscriptionsToRemove.length > 0) {
      console.log("[CLEANUP] Removing", subscriptionsToRemove.length, "stale subscriptions");
      try {
        await admin
          .from("user_push_subscriptions")
          .delete()
          .in("endpoint", subscriptionsToRemove);
      } catch (e) {
        console.error("[CLEANUP] Failed to remove stale subscriptions:", e);
      }
    }

    console.log("=== PUSH NOTIFICATION FUNCTION END ===");
    return jsonResponse({ ok:true, sent: sentCount, total: subs.length });
  } catch (e) {
    console.error("FATAL ERROR:", e);
    return jsonResponse({ error:String(e) }, 500);
  }
});