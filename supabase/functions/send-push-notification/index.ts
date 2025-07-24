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

        const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        const unsignedToken = `${encodedHeader}.${encodedPayload}`;

        // Import VAPID private key - use URL-safe base64 format directly
        const privateKeyBuffer = urlBase64ToUint8Array(vapidPrivateKey);
        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          privateKeyBuffer,
          {
            name: 'ECDSA',
            namedCurve: 'P-256'
          },
          false,
          ['sign']
        );

        // Sign the token
        const signature = await crypto.subtle.sign(
          {
            name: 'ECDSA',
            hash: 'SHA-256'
          },
          cryptoKey,
          new TextEncoder().encode(unsignedToken)
        );

        const encodedSignature = arrayBufferToBase64(signature);
        return `${unsignedToken}.${encodedSignature}`;
      } catch (error) {
        console.error('Error creating VAPID JWT:', error);
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
      try {
        const jwt = await createVapidJWT(vapidPublicKey, vapidPrivateKey, subscription.endpoint);
        
        // Encrypt the payload (simplified for now)
        const encryptedPayload = await encryptPayload(payload, subscription.keys.p256dh, subscription.keys.auth);
        
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

        console.log(`Sending push notification to endpoint: ${subscription.endpoint}`);
        console.log(`Headers:`, headers);
        
        const response = await fetch(subscription.endpoint, {
          method: 'POST',
          headers,
          body: encryptedPayload
        });

        console.log(`Push service response status: ${response.status}`);
        
        if (!response.ok) {
          const responseText = await response.text();
          console.error(`Push service error response: ${responseText}`);
          throw new Error(`Push service responded with status: ${response.status} - ${responseText}`);
        }
        
        console.log('Push notification sent successfully');
      } catch (error) {
        console.error('Error in sendWebPushNotification:', error);
        throw error;
      }
    };

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

          // Format subscription for web-push
          const webPushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          };

          // Send notification using native Web Push Protocol
          await sendWebPushNotification(webPushSubscription, payload, vapidPublicKey, vapidPrivateKey);
          
          console.log(`Push notification sent successfully to subscription ${subscription.id}`);
          return { subscriptionId: subscription.id, success: true };
          
        } catch (error) {
          console.error(`Error sending to subscription ${subscription.id}:`, error);
          
          // If subscription is invalid (410 or 404), remove it
          if (error.statusCode === 410 || error.statusCode === 404) {
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
});