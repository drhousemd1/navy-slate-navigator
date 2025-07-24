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

    const createVapidJWT = async (vapidPublicKey: string, vapidPrivateKey: string, endpoint: string): Promise<string> => {
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

      const encodedHeader = arrayBufferToBase64(new TextEncoder().encode(JSON.stringify(header)));
      const encodedPayload = arrayBufferToBase64(new TextEncoder().encode(JSON.stringify(payload)));
      const unsignedToken = `${encodedHeader}.${encodedPayload}`;

      // Import VAPID private key
      const privateKeyBuffer = urlBase64ToUint8Array(vapidPrivateKey);
      const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
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
    };

    const sendWebPushNotification = async (subscription: any, payload: string, vapidPublicKey: string, vapidPrivateKey: string): Promise<void> => {
      const jwt = await createVapidJWT(vapidPublicKey, vapidPrivateKey, subscription.endpoint);
      
      const response = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'aes128gcm',
          'TTL': '86400'
        },
        body: payload
      });

      if (!response.ok) {
        throw new Error(`Push service responded with status: ${response.status}`);
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