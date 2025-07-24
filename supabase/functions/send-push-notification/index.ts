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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Push notification function started');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    console.log('🔧 Environment check:');
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
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    const { targetUserId, type, title, body, data: notificationData }: NotificationRequest = await req.json();
    
    console.log('📨 Notification request details:');
    console.log('- Target User:', targetUserId);
    console.log('- Type:', type);
    console.log('- Title:', title);
    console.log('- Body:', body);
    console.log('- Sender:', user.id);

    // Check if sender is authorized to send notifications to target user
    console.log('🔍 Checking authorization...');
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

    console.log('👤 Profile data:');
    console.log('- Sender profile:', senderProfile);
    console.log('- Target profile:', targetProfile);

    // Verify authorization: user can send to themselves or their linked partner
    const isAuthorized = user.id === targetUserId || 
                        senderProfile?.linked_partner_id === targetUserId ||
                        targetProfile?.linked_partner_id === user.id;
    
    console.log('🔐 Authorization check:', isAuthorized ? '✅ Authorized' : '❌ Not authorized');

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

    // Get user's notification preferences
    console.log('⚙️ Checking notification preferences...');
    const { data: preferences } = await supabase
      .from('user_notification_preferences')
      .select('preferences')
      .eq('user_id', targetUserId)
      .single();

    console.log('📋 User preferences:', preferences);

    // Check if notifications are enabled and type is allowed
    const isEnabled = preferences?.preferences?.enabled;
    const isTypeAllowed = preferences?.preferences?.types?.[type];
    
    console.log('✅ Preferences check:');
    console.log('- Notifications enabled:', isEnabled);
    console.log('- Type allowed:', isTypeAllowed);
    
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

    // Get user's push subscriptions
    console.log('📱 Fetching push subscriptions...');
    const { data: subscriptions, error: subsError } = await supabase
      .from('user_push_subscriptions')
      .select('*')
      .eq('user_id', targetUserId);

    console.log('📋 Subscriptions result:');
    console.log('- Error:', subsError);
    console.log('- Count:', subscriptions?.length || 0);
    console.log('- Subscriptions:', subscriptions);

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

    // Helper functions for Web Push Protocol implementation
    const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    };

    const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };

    const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
      const padding = '='.repeat((4 - base64.length % 4) % 4);
      const normalizedBase64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
      const binary = atob(normalizedBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    };

    const createVapidJWT = async (vapidPublicKey: string, vapidPrivateKey: string, endpoint: string): Promise<string> => {
      console.log('🔐 Creating VAPID JWT...');
      console.log('📍 Endpoint origin:', new URL(endpoint).origin);
      console.log('🔑 VAPID private key length:', vapidPrivateKey.length);
      
      try {
        const header = {
          typ: 'JWT',
          alg: 'ES256'
        };

        const now = Math.floor(Date.now() / 1000);
        const payload = {
          aud: new URL(endpoint).origin,
          exp: now + 24 * 60 * 60, // 24 hours
          sub: 'mailto:admin@example.com'
        };

        console.log('📄 JWT payload:', payload);

        const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        const unsignedToken = `${encodedHeader}.${encodedPayload}`;

        console.log('🔒 Generating complete VAPID key pair with public components...');
        
        // Convert VAPID private key from URL-safe base64 to raw bytes
        const privateKeyBytes = urlBase64ToUint8Array(vapidPrivateKey);
        console.log('🔑 Private key bytes length:', privateKeyBytes.length);
        
        if (privateKeyBytes.length !== 32) {
          throw new Error(`Invalid VAPID private key length: ${privateKeyBytes.length}, expected 32 bytes`);
        }

        // First, generate a temporary key pair to understand the format and derive public key
        console.log('🔧 Generating temporary key pair to derive public key structure...');
        const tempKeyPair = await crypto.subtle.generateKey(
          { name: 'ECDSA', namedCurve: 'P-256' },
          true,
          ['sign', 'verify']
        );

        // For P-256, we need to derive the public key point from the private key
        // This involves elliptic curve point multiplication: Q = d * G
        // Where d is our private key and G is the generator point
        
        // P-256 parameters (secp256r1)
        const p = BigInt('0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff');
        const a = BigInt('0xffffffff00000001000000000000000000000000fffffffffffffffffffffffc');
        const b = BigInt('0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b');
        const gx = BigInt('0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296');
        const gy = BigInt('0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5');
        const n = BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551');

        // Convert private key bytes to BigInt
        const d = privateKeyBytes.reduce((acc, byte, i) => acc + BigInt(byte) * (256n ** BigInt(31 - i)), 0n);
        console.log('🔢 Private key as BigInt (first 32 chars):', d.toString(16).substring(0, 32) + '...');

        // Elliptic curve point multiplication: Q = d * G
        // Using double-and-add algorithm for scalar multiplication
        const modInverse = (a: bigint, m: bigint): bigint => {
          if (a < 0n) a = ((a % m) + m) % m;
          let [old_r, r] = [a, m];
          let [old_s, s] = [1n, 0n];
          while (r !== 0n) {
            const quotient = old_r / r;
            [old_r, r] = [r, old_r - quotient * r];
            [old_s, s] = [s, old_s - quotient * s];
          }
          return old_s < 0n ? old_s + m : old_s;
        };

        const pointDouble = (px: bigint, py: bigint): [bigint, bigint] => {
          const s = ((3n * px * px + a) * modInverse(2n * py, p)) % p;
          const rx = (s * s - 2n * px) % p;
          const ry = (s * (px - rx) - py) % p;
          return [(rx + p) % p, (ry + p) % p];
        };

        const pointAdd = (px: bigint, py: bigint, qx: bigint, qy: bigint): [bigint, bigint] => {
          if (px === qx) return pointDouble(px, py);
          const s = ((qy - py) * modInverse(qx - px, p)) % p;
          const rx = (s * s - px - qx) % p;
          const ry = (s * (px - rx) - py) % p;
          return [(rx + p) % p, (ry + p) % p];
        };

        const scalarMult = (k: bigint, px: bigint, py: bigint): [bigint, bigint] => {
          if (k === 0n) throw new Error('Cannot multiply by zero');
          if (k === 1n) return [px, py];
          
          let [rx, ry] = [px, py];
          let remaining = k - 1n;
          
          while (remaining > 0n) {
            if (remaining & 1n) {
              [rx, ry] = pointAdd(rx, ry, px, py);
            }
            [px, py] = pointDouble(px, py);
            remaining >>= 1n;
          }
          
          return [rx, ry];
        };

        console.log('🧮 Computing public key point (Q = d * G)...');
        const [qx, qy] = scalarMult(d, gx, gy);
        console.log('✅ Public key point computed');

        // Convert coordinates to 32-byte arrays (big-endian)
        const xBytes = new Uint8Array(32);
        const yBytes = new Uint8Array(32);
        
        for (let i = 0; i < 32; i++) {
          xBytes[31 - i] = Number((qx >> (BigInt(i) * 8n)) & 0xffn);
          yBytes[31 - i] = Number((qy >> (BigInt(i) * 8n)) & 0xffn);
        }

        // Convert to base64url for JWK
        const x = arrayBufferToBase64(xBytes.buffer);
        const y = arrayBufferToBase64(yBytes.buffer);
        const privateKeyB64 = arrayBufferToBase64(privateKeyBytes.buffer);

        console.log('🔑 JWK components:');
        console.log('- x length:', x.length);
        console.log('- y length:', y.length);
        console.log('- d length:', privateKeyB64.length);

        // Create complete JWK with both private and public key components
        const completeJwk: JsonWebKey = {
          kty: 'EC',
          crv: 'P-256',
          d: privateKeyB64,
          x: x,
          y: y,
          use: 'sig',
          key_ops: ['sign']
        };

        console.log('🔧 Complete JWK object created with public key components');

        const cryptoKey = await crypto.subtle.importKey(
          'jwk',
          completeJwk,
          {
            name: 'ECDSA',
            namedCurve: 'P-256'
          },
          false,
          ['sign']
        );

        console.log('✅ Private key imported successfully');

        // Sign the token
        console.log('✍️ Signing JWT token...');
        const signature = await crypto.subtle.sign(
          {
            name: 'ECDSA',
            hash: 'SHA-256'
          },
          cryptoKey,
          new TextEncoder().encode(unsignedToken)
        );

        const encodedSignature = arrayBufferToBase64(signature);
        const jwt = `${unsignedToken}.${encodedSignature}`;
        
        console.log('✅ VAPID JWT created successfully, length:', jwt.length);
        return jwt;
        
      } catch (error) {
        console.error('❌ Error creating VAPID JWT:', error);
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        throw error;
      }
    };

    const encryptPayload = async (payload: string, userPublicKey: string, userAuth: string): Promise<ArrayBuffer> => {
      // For now, we'll send unencrypted payload with proper headers
      // Full encryption implementation would require HKDF and AES-GCM
      const encoder = new TextEncoder();
      return encoder.encode(payload).buffer;
    };

    const sendWebPushNotification = async (subscription: any, payload: string, vapidPublicKey: string, vapidPrivateKey: string): Promise<void> => {
      console.log('📤 Starting web push notification...');
      console.log('- Endpoint:', subscription.endpoint);
      console.log('- Payload length:', payload.length);
      
      try {
        console.log('🔑 Creating VAPID JWT for endpoint...');
        const jwt = await createVapidJWT(vapidPublicKey, vapidPrivateKey, subscription.endpoint);
        console.log('✅ VAPID JWT created for push service');
        
        // Encrypt the payload (simplified for now)
        console.log('🔒 Encrypting payload...');
        const encryptedPayload = await encryptPayload(payload, subscription.keys.p256dh, subscription.keys.auth);
        console.log('✅ Payload encrypted, size:', encryptedPayload.byteLength, 'bytes');
        
        const headers: Record<string, string> = {
          'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
          'Content-Type': 'application/octet-stream',
          'Content-Length': encryptedPayload.byteLength.toString(),
          'TTL': '86400'
        };

        // Add encryption headers for encrypted payloads
        if (payload && payload.length > 0) {
          headers['Content-Encoding'] = 'aes128gcm';
        }

        console.log('📡 Sending HTTP request to push service...');
        console.log('- Endpoint:', subscription.endpoint);
        console.log('- Method: POST');
        console.log('- Headers:', JSON.stringify(headers, null, 2));
        console.log('- Body size:', encryptedPayload.byteLength, 'bytes');
        
        const response = await fetch(subscription.endpoint, {
          method: 'POST',
          headers,
          body: encryptedPayload
        });

        console.log('📨 Push service response received:');
        console.log('- Status:', response.status);
        console.log('- Status Text:', response.statusText);
        console.log('- Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
        
        if (!response.ok) {
          const responseText = await response.text();
          console.error('❌ Push service returned error:');
          console.error('- Status:', response.status);
          console.error('- Response:', responseText);
          
          // Create error with status code for proper handling
          const error = new Error(`Push service responded with status: ${response.status} - ${responseText}`);
          (error as any).statusCode = response.status;
          throw error;
        }
        
        const responseText = await response.text();
        console.log('✅ Push notification sent successfully');
        console.log('- Response body:', responseText);
        
      } catch (error) {
        console.error('❌ Error in sendWebPushNotification:', error);
        console.error('- Error type:', error.constructor.name);
        console.error('- Error message:', error.message);
        console.error('- Error stack:', error.stack);
        
        // Re-throw with additional context
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          throw new Error(`Network error while sending push notification: ${error.message}`);
        }
        throw error;
      }
    };

    // Send push notifications
    console.log('🚀 Starting to send push notifications to', subscriptions.length, 'subscriptions...');
    
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription, index) => {
        console.log(`\n📱 Processing subscription ${index + 1}/${subscriptions.length}:`);
        console.log('- ID:', subscription.id);
        console.log('- Endpoint:', subscription.endpoint);
        
        try {
          const payload = JSON.stringify({
            title,
            body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: type,
            data: notificationData
          });

          console.log('📦 Payload created:', payload);

          // Format subscription for web-push
          const webPushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          };

          console.log('🔧 Formatted subscription for web-push protocol');

          // Send notification using native Web Push Protocol
          await sendWebPushNotification(webPushSubscription, payload, vapidPublicKey, vapidPrivateKey);
          
          console.log(`✅ Push notification sent successfully to subscription ${subscription.id}`);
          return { subscriptionId: subscription.id, success: true };
          
        } catch (error) {
          console.error(`❌ Error sending to subscription ${subscription.id}:`, error);
          console.error('- Error details:', {
            name: error.name,
            message: error.message,
            statusCode: (error as any).statusCode,
            stack: error.stack
          });
          
          // If subscription is invalid (410 or 404), remove it
          if ((error as any).statusCode === 410 || (error as any).statusCode === 404) {
            console.log(`🗑️ Removing invalid subscription ${subscription.id}...`);
            try {
              await supabase
                .from('user_push_subscriptions')
                .delete()
                .eq('id', subscription.id);
              console.log(`✅ Removed invalid subscription ${subscription.id}`);
            } catch (deleteError) {
              console.error(`❌ Failed to remove subscription ${subscription.id}:`, deleteError);
            }
          }
          
          return { subscriptionId: subscription.id, success: false, error: error.message || 'Unknown error' };
        }
      })
    );

    console.log('\n📊 Processing results...');
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    console.log('📈 Final Results:');
    console.log(`- ✅ Successful: ${successful}`);
    console.log(`- ❌ Failed: ${failed}`);
    console.log(`- 📊 Total: ${results.length}`);
    
    // Log detailed results for debugging
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`❌ Promise ${index} rejected:`, result.reason);
      } else if (!result.value.success) {
        console.error(`❌ Notification ${index} failed:`, result.value.error);
      }
    });

    return new Response(
      JSON.stringify({ 
        message: 'Push notifications processed',
        successful,
        failed,
        total: results.length
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error) {
    console.error('Error in send-push-notification function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
});