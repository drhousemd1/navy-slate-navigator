import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  targetUserId: string;
  type: 'ruleBroken' | 'taskCompleted' | 'rewardPurchased' | 'rewardRedeemed' | 'punishmentPerformed' | 'wellnessUpdated' | 'wellnessCheckin' | 'messages';
  title: string;
  body: string;
  data?: Record<string, any>;
}

serve(async (req) => {
  console.log('=== PUSH NOTIFICATION FUNCTION START ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Timestamp:', new Date().toISOString());
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    console.log('Environment check:');
    console.log('- Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.log('- Service Role Key:', supabaseKey ? '✅ Set' : '❌ Missing');
    console.log('- VAPID Public Key:', vapidPublicKey ? `✅ Set (${vapidPublicKey.length} chars)` : '❌ Missing');
    console.log('- VAPID Private Key:', vapidPrivateKey ? `✅ Set (${vapidPrivateKey.length} chars)` : '❌ Missing');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('❌ VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'Push notifications not configured' }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    console.log('Auth result:', { hasUser: !!user, authError });
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    const { targetUserId, type, title, body, data: notificationData }: NotificationRequest = await req.json();
    
    console.log('Notification request:');
    console.log('- Target User:', targetUserId);
    console.log('- Type:', type);
    console.log('- Title:', title);
    console.log('- Body:', body);
    console.log('- Sender:', user.id);

    // Check authorization
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('linked_partner_id')
      .eq('id', user.id)
      .single();

    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('linked_partner_id')
      .eq('id', targetUserId)
      .single();

    console.log('Profile data:', { senderProfile, targetProfile });

    const isAuthorized = user.id === targetUserId || 
                        senderProfile?.linked_partner_id === targetUserId ||
                        targetProfile?.linked_partner_id === user.id;
    
    console.log('Authorization check:', isAuthorized ? '✅ Authorized' : '❌ Not authorized');

    if (!isAuthorized) {
      console.error('❌ Authorization failed');
      return new Response(
        JSON.stringify({ error: 'Not authorized to send notifications to this user' }),
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Get notification preferences
    const { data: preferences } = await supabase
      .from('user_notification_preferences')
      .select('preferences')
      .eq('user_id', targetUserId)
      .single();

    console.log('User preferences:', preferences);

    const isEnabled = preferences?.preferences?.enabled;
    const isTypeAllowed = preferences?.preferences?.types?.[type];
    
    console.log('Preferences check - enabled:', isEnabled, 'type allowed:', isTypeAllowed);
    
    if (!isEnabled || !isTypeAllowed) {
      console.log(`❌ Notifications disabled for user ${targetUserId} or type ${type}`);
      return new Response(
        JSON.stringify({ message: 'Notification not sent - user preferences' }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Get push subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('user_push_subscriptions')
      .select('*')
      .eq('user_id', targetUserId);

    console.log('Subscriptions result:', { error: subsError, count: subscriptions?.length || 0 });

    if (subsError || !subscriptions || subscriptions.length === 0) {
      console.log(`❌ No push subscriptions found for user ${targetUserId}`);
      return new Response(
        JSON.stringify({ message: 'No push subscriptions found' }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // ---------------------- BASE64 HELPERS ----------------------
    function b64urlToBytes(input: string): Uint8Array {
      if (!input) throw new Error('Empty base64 input');
      let b64 = input.replace(/-/g, '+').replace(/_/g, '/');
      const pad = b64.length % 4 ? 4 - (b64.length % 4) : 0;
      b64 += '='.repeat(pad);
      const bin = atob(b64);
      return Uint8Array.from(bin, c => c.charCodeAt(0));
    }
    function bytesToB64url(bytes: Uint8Array): string {
      const bin = String.fromCharCode(...bytes);
      return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
    }

    // ---------------------- DER PARSER (ROBUST) ----------------------
    function derToJose(der: Uint8Array): string {
      console.log('[DER] Raw length:', der.length);
      console.log('[DER] Hex:', Array.from(der).map(b => b.toString(16).padStart(2,'0')).join(''));

      if (der[0] !== 0x30) throw new Error('Invalid DER: missing 0x30 sequence tag');
      let offset = 1;
      let seqLen = der[offset++];
      if (seqLen & 0x80) { // long-form length
        const numLenBytes = seqLen & 0x7f;
        if (numLenBytes === 0 || numLenBytes > 2) throw new Error('Invalid DER: bad sequence length');
        seqLen = 0;
        for (let i = 0; i < numLenBytes; i++) seqLen = (seqLen << 8) | der[offset++];
      }

      if (der[offset++] !== 0x02) throw new Error('Invalid DER: missing INTEGER tag for r');
      const rLen = der[offset++];
      const r = der.slice(offset, offset + rLen);
      offset += rLen;

      if (der[offset++] !== 0x02) throw new Error('Invalid DER: missing INTEGER tag for s');
      const sLen = der[offset++];
      const s = der.slice(offset, offset + sLen);

      const normalize = (buf: Uint8Array) => {
        let b = buf[0] === 0x00 ? buf.slice(1) : buf;
        if (b.length > 32) throw new Error('Invalid DER: component longer than 32 bytes');
        const out = new Uint8Array(32);
        out.set(b, 32 - b.length);
        return out;
      };

      const rOut = normalize(r);
      const sOut = normalize(s);
      console.log('[DER] r length (normalized):', rOut.length, 's length:', sOut.length);
      const raw = new Uint8Array(64);
      raw.set(rOut, 0);
      raw.set(sOut, 32);
      return bytesToB64url(raw);
    }

    // ---------------------- VAPID BUILD ----------------------
    async function buildVapidJWT() {
      console.log('--- VAPID JWT BUILD START ---');

      const pubKeyB64 = Deno.env.get('VAPID_PUBLIC_KEY');
      const privKeyB64 = Deno.env.get('VAPID_PRIVATE_KEY');
      if (!pubKeyB64 || !privKeyB64) {
        throw new Error('Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY environment variables');
      }

      // Decode
      let pubBytes: Uint8Array;
      let privBytes: Uint8Array;
      try {
        pubBytes = b64urlToBytes(pubKeyB64);
        privBytes = b64urlToBytes(privKeyB64);
      } catch (e) {
        console.error('[VAPID] Base64 decode failed:', e);
        throw e;
      }
      console.log('[VAPID] Public key bytes length:', pubBytes.length);
      console.log('[VAPID] Private key bytes length:', privBytes.length);

      // Validate lengths
      if (pubBytes.length !== 65 || pubBytes[0] !== 0x04) {
        throw new Error('Public key must be 65 bytes uncompressed starting with 0x04');
      }
      if (privBytes.length !== 32) {
        throw new Error('Private key must be exactly 32 bytes');
      }

      // Derive JWK coordinates
      const x = bytesToB64url(pubBytes.slice(1, 33));
      const y = bytesToB64url(pubBytes.slice(33, 65));
      const d = privKeyB64.replace(/=/g,''); // treat as already base64url
      console.log('[VAPID] Derived x,y lengths:', x.length, y.length);

      // Import private key
      let key: CryptoKey;
      try {
        key = await crypto.subtle.importKey(
          'jwk',
          { kty: 'EC', crv: 'P-256', d, x, y, ext: true },
          { name: 'ECDSA', namedCurve: 'P-256' },
          false,
          ['sign']
        );
        console.log('[VAPID] Private key import OK');
      } catch (e) {
        console.error('[VAPID] importKey failed:', e);
        throw e;
      }

      // Build header/payload
      const aud = 'https://web.push.apple.com';
      const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
      const header = bytesToB64url(new TextEncoder().encode(JSON.stringify({ alg: 'ES256', typ: 'JWT' })));
      const payload = bytesToB64url(new TextEncoder().encode(JSON.stringify({ aud, exp, sub: 'mailto:admin@example.com' })));
      const signingInput = `${header}.${payload}`;

      // Sign
      let sigDer: Uint8Array;
      try {
        sigDer = new Uint8Array(
          await crypto.subtle.sign(
            { name: 'ECDSA', hash: 'SHA-256' },
            key,
            new TextEncoder().encode(signingInput)
          )
        );
        console.log('[VAPID] sign() produced DER length:', sigDer.length);
      } catch (e) {
        console.error('[VAPID] sign() failed:', e);
        throw e;
      }

      // DER -> raw signature
      let signatureB64url: string;
      try {
        signatureB64url = derToJose(sigDer);
      } catch (e) {
        console.error('[VAPID] DER parse failed:', e);
        throw e;
      }

      const jwt = `${signingInput}.${signatureB64url}`;
      console.log('[VAPID] JWT created successfully (length):', jwt.length);
      return { jwt, publicKey: pubKeyB64 };
    }

    // ---------------------- SEND EMPTY PUSH (CALL THIS) ----------------------
    async function sendEmptyPush(subscription: { endpoint: string }) {
      console.log('--- SEND EMPTY PUSH START ---');
      const { jwt, publicKey } = await buildVapidJWT();

      const headers: Record<string, string> = {
        'Authorization': `WebPush ${jwt}`,
        'Crypto-Key': `p256ecdsa=${publicKey}`,
        'TTL': '86400'
      };
      console.log('[PUSH] Headers prepared:', headers);

      const resp = await fetch(subscription.endpoint, { method: 'POST', headers });
      const text = await resp.text().catch(() => '');
      console.log('[PUSH] Service response status:', resp.status, 'body:', text.slice(0, 200));
      if (resp.status >= 400) {
        throw new Error(`Push service returned HTTP ${resp.status}`);
      }
      console.log('--- SEND EMPTY PUSH END (SUCCESS) ---');
    }

    // ---------------------- MAIN HANDLER ----------------------
    try {
      let successCount = 0;
      let failedCount = 0;
      
      console.log('🧪 Testing empty push notifications with ChatGPT DROP-IN PATCH...');

      for (const subscription of subscriptions) {
        try {
          await sendEmptyPush(subscription);
          successCount++;
        } catch (error: any) {
          failedCount++;
          console.error('[MAIN] Push failed:', error.message);
          
          // Remove invalid subscriptions on 410/404
          if (error.message.includes('410') || error.message.includes('404')) {
            console.log('🗑️ Removing invalid subscription');
            await supabase
              .from('user_push_subscriptions')
              .delete()
              .eq('endpoint', subscription.endpoint);
          }
        }
      }

      console.log('\n=== FINAL RESULTS ===');
      console.log(`✅ Successful: ${successCount}`);
      console.log(`❌ Failed: ${failedCount}`);
      console.log(`📊 Total: ${subscriptions.length}`);

      return new Response(
        JSON.stringify({ 
          message: 'Empty push notifications processed with ChatGPT DROP-IN PATCH',
          successful: successCount,
          failed: failedCount,
          total: subscriptions.length,
          patchVersion: 'ChatGPT-DROP-IN-PATCH'
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );

    } catch (mainError) {
      console.error('[MAIN] FATAL ERROR:', mainError);
      return new Response(
        JSON.stringify({ 
          error: 'Main handler failed',
          details: String(mainError) 
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

  } catch (error) {
    console.error('=== FUNCTION ERROR ===', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
});