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

    // WebCrypto JWT signing implementation
    function b64urlToBytes(b64: string): Uint8Array {
      b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
      const pad = b64.length % 4 ? 4 - (b64.length % 4) : 0;
      const bin = atob(b64 + '='.repeat(pad));
      return Uint8Array.from(bin, c => c.charCodeAt(0));
    }

    function bytesToB64url(bytes: Uint8Array): string {
      let s = btoa(String.fromCharCode(...bytes));
      return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function derToJose(der: Uint8Array): string {
      // Optional debug — keep while testing
      console.log("DER signature hex:", Array.from(der).map(b => b.toString(16).padStart(2,'0')).join(''));

      if (der[0] !== 0x30) throw new Error('Invalid DER: missing 0x30');
      let offset = 2;
      let lengthByte = der[1];
      if (lengthByte & 0x80) {
        // Long-form length
        const numLenBytes = lengthByte & 0x7f;
        if (numLenBytes === 0 || numLenBytes > 2) throw new Error('Invalid DER: length field too large');
        let totalLen = 0;
        for (let i = 0; i < numLenBytes; i++) {
          totalLen = (totalLen << 8) | der[2 + i];
        }
        offset = 2 + numLenBytes;
        // (We don't really need totalLen for parsing r/s; trusting structure)
      }

      if (der[offset] !== 0x02) throw new Error('Invalid DER: missing INTEGER for r');
      const rLen = der[offset + 1];
      const rStart = offset + 2;
      const rEnd = rStart + rLen;
      const r = der.slice(rStart, rEnd);
      offset = rEnd;

      if (der[offset] !== 0x02) throw new Error('Invalid DER: missing INTEGER for s');
      const sLen = der[offset + 1];
      const sStart = offset + 2;
      const sEnd = sStart + sLen;
      const s = der.slice(sStart, sEnd);

      const normalize = (buf: Uint8Array) => {
        // Strip leading 0x00 if present
        let b = buf[0] === 0x00 ? buf.slice(1) : buf;
        if (b.length > 32) throw new Error('Invalid DER: component too long');
        const out = new Uint8Array(32);
        out.set(b, 32 - b.length);
        return out;
      };

      const rOut = normalize(r);
      const sOut = normalize(s);
      const raw = new Uint8Array(64);
      raw.set(rOut, 0);
      raw.set(sOut, 32);
      return bytesToB64url(raw);
    }

    // Create real VAPID JWT using WebCrypto ES256 signing
    console.log('Creating VAPID JWT with WebCrypto ES256 signing...');
    
    try {
      // Derive x,y from uncompressed public key (65 bytes, first byte 0x04)
      const pubBytes = b64urlToBytes(vapidPublicKey);
      console.log('Public key bytes length:', pubBytes.length);
      
      const x = bytesToB64url(pubBytes.slice(1, 33));
      const y = bytesToB64url(pubBytes.slice(33, 65));
      const d = vapidPrivateKey; // already base64url

      // Import private key for ES256 signing
      const key = await crypto.subtle.importKey(
        'jwk',
        { kty: 'EC', crv: 'P-256', d, x, y, ext: true },
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      );

      console.log('Private key imported successfully');

      // Build JWT with proper audience for Apple's service
      const aud = 'https://web.push.apple.com';
      const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours
      const jwtHeader = bytesToB64url(new TextEncoder().encode(JSON.stringify({ alg: 'ES256', typ: 'JWT' })));
      const jwtPayload = bytesToB64url(new TextEncoder().encode(JSON.stringify({ 
        aud, 
        exp, 
        sub: 'mailto:admin@example.com' 
      })));
      
      const toSign = new TextEncoder().encode(`${jwtHeader}.${jwtPayload}`);
      const sigDer = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, toSign));

      // Convert DER signature to JOSE format (raw R||S)
      const sig = derToJose(sigDer);
      const jwt = `${jwtHeader}.${jwtPayload}.${sig}`;

      console.log('VAPID JWT created and signed successfully');

      // Send notifications with proper WebPush headers
      let successCount = 0;
      let failedCount = 0;

      console.log('🧪 Testing empty push notifications with real ES256 VAPID JWT...');

      for (let i = 0; i < subscriptions.length; i++) {
        const subscription = subscriptions[i];
        
        console.log(`\n📱 Processing subscription ${i + 1}/${subscriptions.length}:`);
        console.log('- ID:', subscription.id);
        console.log('- Endpoint:', subscription.endpoint);
        
        try {
          // Headers for empty push notification with proper VAPID auth
          const headers = {
            'Authorization': `WebPush ${jwt}`,
            'Crypto-Key': `p256ecdsa=${vapidPublicKey}`,
            'TTL': '86400'
          };

          console.log('Request headers:', headers);

          const response = await fetch(subscription.endpoint, {
            method: 'POST',
            headers
            // No body for empty push test
          });

          console.log(`Push response: ${response.status} ${response.statusText}`);
          
          if (response.ok || response.status === 201) {
            successCount++;
            console.log(`✅ Empty notification ${i + 1} sent successfully`);
          } else {
            failedCount++;
            const errorText = await response.text();
            console.error(`❌ Failed notification ${i + 1}:`, response.status, errorText);
            
            // Remove invalid subscriptions
            if (response.status === 410 || response.status === 404) {
              console.log('🗑️ Removing invalid subscription');
              await supabase
                .from('user_push_subscriptions')
                .delete()
                .eq('id', subscription.id);
            }
          }
        } catch (error: any) {
          failedCount++;
          console.error(`❌ Error sending notification ${i + 1}:`, error.message);
        }
      }

      console.log('\n=== FINAL RESULTS ===');
      console.log(`✅ Successful: ${successCount}`);
      console.log(`❌ Failed: ${failedCount}`);
      console.log(`📊 Total: ${subscriptions.length}`);

      return new Response(
        JSON.stringify({ 
          message: 'Empty push notifications processed with real VAPID JWT',
          successful: successCount,
          failed: failedCount,
          total: subscriptions.length,
          jwtCreated: true
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );

    } catch (jwtError) {
      console.error('❌ JWT creation failed:', jwtError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create VAPID JWT',
          details: jwtError.message 
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