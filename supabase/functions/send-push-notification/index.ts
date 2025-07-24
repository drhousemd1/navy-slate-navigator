import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

const serve_handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
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

    // Check if sender is authorized to send notifications to target user
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

    // Verify authorization: user can send to themselves or their linked partner
    const isAuthorized = user.id === targetUserId || 
                        senderProfile?.linked_partner_id === targetUserId ||
                        targetProfile?.linked_partner_id === user.id;

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to send notifications to this user' }),
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Get user's notification preferences
    const { data: preferences } = await supabase
      .from('user_notification_preferences')
      .select('preferences')
      .eq('user_id', targetUserId)
      .single();

    // Check if notifications are enabled and type is allowed
    if (!preferences?.preferences?.enabled || !preferences?.preferences?.types?.[type]) {
      console.log(`Notifications disabled for user ${targetUserId} or type ${type}`);
      return new Response(
        JSON.stringify({ message: 'Notification not sent - user preferences' }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('user_push_subscriptions')
      .select('*')
      .eq('user_id', targetUserId);

    if (subsError || !subscriptions || subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${targetUserId}`);
      return new Response(
        JSON.stringify({ message: 'No push subscriptions found' }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Manual Web Push implementation since libraries are unreliable in Deno
    async function sendWebPushNotification(subscription: any, payload: string) {
      try {
        console.log(`Sending push notification to endpoint: ${subscription.endpoint}`);
        
        // Validate subscription data
        if (!subscription.endpoint || !subscription.p256dh || !subscription.auth) {
          throw new Error('Invalid subscription: missing endpoint, p256dh, or auth');
        }

        // Create JWT for VAPID
        const header = {
          "typ": "JWT",
          "alg": "ES256"
        };

        const now = Math.floor(Date.now() / 1000);
        const exp = now + 86400; // 24 hours

        const claims = {
          "aud": new URL(subscription.endpoint).origin,
          "exp": exp,
          "sub": "mailto:support@navy-slate-navigator.com"
        };

        // Encode header and payload
        const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        const encodedPayload = btoa(JSON.stringify(claims)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        const unsignedToken = `${encodedHeader}.${encodedPayload}`;

        // Import VAPID private key
        const privateKeyBytes = Uint8Array.from(atob(vapidPrivateKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
        const privateKey = await crypto.subtle.importKey(
          'pkcs8',
          privateKeyBytes,
          { name: 'ECDSA', namedCurve: 'P-256' },
          false,
          ['sign']
        );

        // Sign the JWT
        const signature = await crypto.subtle.sign(
          { name: 'ECDSA', hash: 'SHA-256' },
          privateKey,
          new TextEncoder().encode(unsignedToken)
        );

        const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

        const jwt = `${unsignedToken}.${encodedSignature}`;

        // Prepare headers
        const headers: Record<string, string> = {
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'aes128gcm',
          'TTL': '86400',
          'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`
        };

        // Encrypt payload
        const textEncoder = new TextEncoder();
        const payloadBytes = textEncoder.encode(payload);

        // Generate salt (16 bytes)
        const salt = crypto.getRandomValues(new Uint8Array(16));
        
        // Convert keys from base64url
        const p256dhBytes = Uint8Array.from(atob(subscription.p256dh.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
        const authBytes = Uint8Array.from(atob(subscription.auth.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

        // Generate local key pair
        const localKeyPair = await crypto.subtle.generateKey(
          { name: 'ECDH', namedCurve: 'P-256' },
          true,
          ['deriveKey']
        );

        // Export local public key
        const localPublicKeyBuffer = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
        const localPublicKey = new Uint8Array(localPublicKeyBuffer);

        // Import user's public key
        const userPublicKey = await crypto.subtle.importKey(
          'raw',
          p256dhBytes,
          { name: 'ECDH', namedCurve: 'P-256' },
          false,
          []
        );

        // Derive shared secret
        const sharedSecret = await crypto.subtle.deriveKey(
          { name: 'ECDH', public: userPublicKey },
          localKeyPair.privateKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt']
        );

        // Create encryption context
        const context = textEncoder.encode('Content-Encoding: aes128gcm\0');
        
        // Derive encryption key
        const keyInfo = new Uint8Array([
          ...context,
          ...new Uint8Array([0, 1])
        ]);

        const prk = await crypto.subtle.importKey(
          'raw',
          await crypto.subtle.deriveBits(
            { name: 'ECDH', public: userPublicKey },
            localKeyPair.privateKey,
            256
          ),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );

        const encryptionKey = await crypto.subtle.importKey(
          'raw',
          (await crypto.subtle.sign('HMAC', prk, new Uint8Array([...salt, ...authBytes, ...keyInfo]))).slice(0, 16),
          { name: 'AES-GCM', length: 128 },
          false,
          ['encrypt']
        );

        // Create nonce
        const nonceInfo = new Uint8Array([
          ...context,
          ...new Uint8Array([0, 1])
        ]);
        
        const nonce = (await crypto.subtle.sign('HMAC', prk, new Uint8Array([...salt, ...authBytes, ...nonceInfo]))).slice(0, 12);

        // Encrypt payload
        const paddedPayload = new Uint8Array([...payloadBytes, 2]); // Add padding delimiter
        const encryptedPayload = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: new Uint8Array(nonce) },
          encryptionKey,
          paddedPayload
        );

        // Create final payload
        const finalPayload = new Uint8Array([
          ...salt,
          ...new Uint8Array([0, 0, 16, 0]), // rs=4096 as uint32be
          65, // public key length
          ...localPublicKey,
          ...new Uint8Array(encryptedPayload)
        ]);

        // Send the request
        const response = await fetch(subscription.endpoint, {
          method: 'POST',
          headers,
          body: finalPayload
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Push service error: ${response.status} ${response.statusText} - ${errorText}`);
          throw new Error(`Push service error: ${response.status} ${response.statusText}`);
        }
        
        console.log(`Push notification sent successfully to ${subscription.endpoint}`);
        return true;
      } catch (error) {
        console.error('Push notification error:', error);
        throw error;
      }
    }

    // Send push notifications
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          const payload = JSON.stringify({
            title,
            body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: type,
            data: notificationData
          });

          await sendWebPushNotification(subscription, payload);
          
          console.log(`Push notification sent successfully to subscription ${subscription.id}`);
          return { subscriptionId: subscription.id, success: true };
        } catch (error) {
          console.error(`Error sending to subscription ${subscription.id}:`, error);
          
          // If subscription is invalid (410 or 404), remove it
          if (error.status === 410 || error.status === 404) {
            await supabase
              .from('user_push_subscriptions')
              .delete()
              .eq('id', subscription.id);
            console.log(`Removed invalid subscription ${subscription.id}`);
          }
          
          return { subscriptionId: subscription.id, success: false, error: error.message || 'Unknown error' };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    console.log(`Push notifications sent: ${successful} successful, ${failed} failed`);

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
};

serve(serve_handler);