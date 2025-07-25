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

/* ================= VAPID JWT BUILDER ================= */
async function buildVapidJWT() {
  console.log("--- VAPID JWT BUILD START ---");
  const pubKeyB64 = Deno.env.get("VAPID_PUBLIC_KEY");
  const privKeyB64 = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!pubKeyB64 || !privKeyB64) throw new Error("Missing VAPID env vars");

  const pubBytes = b64urlToBytes(pubKeyB64);
  const privBytes = b64urlToBytes(privKeyB64);
  console.log("[VAPID] Public key length:", pubBytes.length);
  console.log("[VAPID] Private key length:", privBytes.length);
  if (pubBytes.length !== 65 || pubBytes[0] !== 0x04) throw new Error("Public key must be 65 bytes starting 0x04");
  if (privBytes.length !== 32) throw new Error("Private key must be 32 bytes");

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
  console.log("[VAPID] importKey OK");

  const aud = "https://web.push.apple.com";
  const exp = Math.floor(Date.now()/1000) + 12*60*60;
  const header = bytesToB64url(new TextEncoder().encode(JSON.stringify({alg:"ES256",typ:"JWT"})));
  const payload = bytesToB64url(new TextEncoder().encode(JSON.stringify({aud,exp,sub:"mailto:admin@example.com"})));
  const signingInput = `${header}.${payload}`;

  const sigBytes = new Uint8Array(await crypto.subtle.sign(
    {name:"ECDSA", hash:"SHA-256"},
    key,
    new TextEncoder().encode(signingInput)
  ));
  console.log("[VAPID] sign() returned length:", sigBytes.length, "firstByte:", sigBytes[0]);

  const signature = signatureToJose(sigBytes);
  const jwt = `${signingInput}.${signature}`;
  console.log("[VAPID] JWT built length:", jwt.length);
  return { jwt, publicKey: pubKeyB64 };
}

/* ================= SEND EMPTY PUSH ================= */
async function sendEmptyPush(endpoint: string) {
  console.log("--- SEND EMPTY PUSH START ---");
  const { jwt, publicKey } = await buildVapidJWT();
  const headers: Record<string,string> = {
    "Authorization": `WebPush ${jwt}`,
    "Crypto-Key": `p256ecdsa=${publicKey}`,
    "TTL": "86400",
  };
  console.log("[PUSH] Headers:", headers);
  const resp = await fetch(endpoint, { method:"POST", headers });
  const text = await resp.text().catch(()=> "");
  console.log("[PUSH] Response status:", resp.status, "body:", text.slice(0,200));
  if (resp.status >= 400) throw new Error("Push service HTTP "+resp.status);
  console.log("--- SEND EMPTY PUSH END SUCCESS ---");
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
      await sendEmptyPush(body.endpoint);
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

    // Look up subscriptions
    const { data: subs, error: subErr } = await admin
      .from("user_push_subscriptions")
      .select("endpoint")
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

    // Send empty push to each subscription (payload encryption later)
    for (const sub of subs) {
      try {
        await sendEmptyPush(sub.endpoint);
      } catch (e) {
        console.error("Send failed for endpoint:", sub.endpoint, e);
      }
    }

    console.log("=== PUSH NOTIFICATION FUNCTION END ===");
    return jsonResponse({ ok:true, sent: subs.length });
  } catch (e) {
    console.error("FATAL ERROR:", e);
    return jsonResponse({ error:String(e) }, 500);
  }
});