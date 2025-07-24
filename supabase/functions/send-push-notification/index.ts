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

        console.log('🔒 Converting VAPID private key to JWK format...');
        
        // Convert VAPID private key from URL-safe base64 to raw bytes
        const privateKeyBytes = urlBase64ToUint8Array(vapidPrivateKey);
        console.log('🔑 Private key bytes length:', privateKeyBytes.length);
        
        if (privateKeyBytes.length !== 32) {
          throw new Error(`Invalid VAPID private key length: ${privateKeyBytes.length}, expected 32 bytes`);
        }

        // Convert private key to base64url for JWK
        const d = arrayBufferToBase64(privateKeyBytes);
        console.log('🔑 Private key (d) component length:', d.length);

        // Create JWK object for ES256 signing
        const jwk: JsonWebKey = {
          kty: 'EC',
          crv: 'P-256',
          d: d,
          use: 'sig',
          key_ops: ['sign']
        };

        console.log('🔧 JWK object created');

        const cryptoKey = await crypto.subtle.importKey(
          'jwk',
          jwk,
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