import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

/* -------------------- CORS SETUP -------------------- */
const corsHeaders: Record<string,string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* -------------------- BASE64 HELPERS -------------------- */
function b64urlToBytes(input: string): Uint8Array {
  if (!input) throw new Error("Empty base64 input");
  let b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? 4 - (b64.length % 4) : 0;
  b64 += "=".repeat(pad);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
function bytesToB64url(bytes: Uint8Array): string {
  const bin = String.fromCharCode(...bytes);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/,"");
}

/* -------------------- DER PARSER -------------------- */
function derToJose(der: Uint8Array): string {
  console.log("[DER] Raw length:", der.length);
  console.log("[DER] Hex:", Array.from(der).map(b => b.toString(16).padStart(2,"0")).join(""));
  if (der[0] !== 0x30) throw new Error("Invalid DER: missing 0x30");
  let offset = 1;
  let seqLen = der[offset++];
  if (seqLen & 0x80) {
    const numLenBytes = seqLen & 0x7f;
    if (numLenBytes === 0 || numLenBytes > 2) throw new Error("Invalid DER: bad seq length");
    seqLen = 0;
    for (let i=0;i<numLenBytes;i++) seqLen = (seqLen<<8)|der[offset++];
  }
  if (der[offset++] !== 0x02) throw new Error("Invalid DER: missing INTEGER r");
  const rLen = der[offset++]; const r = der.slice(offset, offset+rLen); offset += rLen;
  if (der[offset++] !== 0x02) throw new Error("Invalid DER: missing INTEGER s");
  const sLen = der[offset++]; const s = der.slice(offset, offset+sLen);

  const normalize = (buf: Uint8Array) => {
    let b = buf[0] === 0x00 ? buf.slice(1) : buf;
    if (b.length > 32) throw new Error("Invalid DER: component >32");
    const out = new Uint8Array(32); out.set(b, 32 - b.length); return out;
  };
  const rOut = normalize(r); const sOut = normalize(s);
  console.log("[DER] rOut len:", rOut.length, "sOut len:", sOut.length);
  const raw = new Uint8Array(64); raw.set(rOut,0); raw.set(sOut,32);
  return bytesToB64url(raw);
}

/* -------------------- VAPID JWT BUILDER -------------------- */
async function buildVapidJWT() {
  console.log("--- VAPID JWT BUILD START ---");
  const pubKeyB64 = Deno.env.get("VAPID_PUBLIC_KEY");
  const privKeyB64 = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!pubKeyB64 || !privKeyB64) throw new Error("Missing VAPID env vars");

  let pubBytes: Uint8Array; let privBytes: Uint8Array;
  try { pubBytes = b64urlToBytes(pubKeyB64); privBytes = b64urlToBytes(privKeyB64); }
  catch (e) { console.error("[VAPID] base64 decode failed", e); throw e; }

  console.log("[VAPID] Public key length:", pubBytes.length);
  console.log("[VAPID] Private key length:", privBytes.length);
  if (pubBytes.length !== 65 || pubBytes[0] !== 0x04) throw new Error("Public key must be 65 bytes with 0x04 prefix");
  if (privBytes.length !== 32) throw new Error("Private key must be 32 bytes");

  const x = bytesToB64url(pubBytes.slice(1,33));
  const y = bytesToB64url(pubBytes.slice(33,65));
  const d = privKeyB64.replace(/=/g,"");
  console.log("[VAPID] x,y lengths:", x.length, y.length);

  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      "jwk",
      { kty:"EC", crv:"P-256", d, x, y, ext:true },
      { name:"ECDSA", namedCurve:"P-256" },
      false,
      ["sign"]
    );
    console.log("[VAPID] importKey OK");
  } catch (e) { console.error("[VAPID] importKey failed", e); throw e; }

  const aud = "https://web.push.apple.com";
  const exp = Math.floor(Date.now()/1000) + 12*60*60;
  const header = bytesToB64url(new TextEncoder().encode(JSON.stringify({alg:"ES256",typ:"JWT"})));
  const payload = bytesToB64url(new TextEncoder().encode(JSON.stringify({aud,exp,sub:"mailto:admin@example.com"})));
  const signingInput = `${header}.${payload}`;

  let sigDer: Uint8Array;
  try {
    sigDer = new Uint8Array(await crypto.subtle.sign(
      {name:"ECDSA", hash:"SHA-256"},
      key,
      new TextEncoder().encode(signingInput)
    ));
    console.log("[VAPID] sign() DER length:", sigDer.length);
  } catch (e) { console.error("[VAPID] sign() failed", e); throw e; }

  let signatureB64url: string;
  try { signatureB64url = derToJose(sigDer); }
  catch (e) { console.error("[VAPID] DER parse failed", e); throw e; }

  const jwt = `${signingInput}.${signatureB64url}`;
  console.log("[VAPID] JWT built length:", jwt.length);
  return { jwt, publicKey: pubKeyB64 };
}

/* -------------------- SEND EMPTY PUSH -------------------- */
async function sendEmptyPush(endpoint: string) {
  console.log("--- SEND EMPTY PUSH START ---");
  const { jwt, publicKey } = await buildVapidJWT();
  const headers: Record<string,string> = {
    "Authorization": `WebPush ${jwt}`,
    "Crypto-Key": `p256ecdsa=${publicKey}`,
    "TTL": "86400"
  };
  console.log("[PUSH] Headers:", headers);
  const resp = await fetch(endpoint, { method:"POST", headers });
  const text = await resp.text().catch(()=> "");
  console.log("[PUSH] Response status:", resp.status, "body:", text.slice(0,200));
  if (resp.status >= 400) throw new Error("Push service HTTP "+resp.status);
  console.log("--- SEND EMPTY PUSH END SUCCESS ---");
}

/* -------------------- MAIN HANDLER -------------------- */
serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status:200, headers: corsHeaders });
  }

  try {
    console.log("=== PUSH NOTIFICATION FUNCTION START ===");
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error:"method not allowed"}), { status:405, headers: { ...corsHeaders, "Content-Type":"application/json" } });
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      console.log("Missing/invalid Authorization header");
      return new Response(JSON.stringify({ error:"unauthorized"}), {status:401, headers:{...corsHeaders,"Content-Type":"application/json"}});
    }

    const body = await req.json().catch(()=> ({} as any));
    if (body.mode === "ping") {
      console.log("PING MODE OK");
      return new Response(JSON.stringify({ ok:true, mode:"ping" }), {status:200, headers:{...corsHeaders,"Content-Type":"application/json"}});
    }

    const endpoint = body.endpoint;
    if (!endpoint) {
      console.log("No endpoint provided; returning 400.");
      return new Response(JSON.stringify({ error:"endpoint required"}), {status:400, headers:{...corsHeaders,"Content-Type":"application/json"}});
    }

    await sendEmptyPush(endpoint);
    console.log("=== PUSH NOTIFICATION FUNCTION END ===");
    return new Response(JSON.stringify({ ok:true }), {status:200, headers:{...corsHeaders,"Content-Type":"application/json"}});
  } catch (e) {
    console.error("FATAL ERROR:", e);
    return new Response(JSON.stringify({ error:String(e) }), {status:500, headers:{...corsHeaders,"Content-Type":"application/json"}});
  }
});