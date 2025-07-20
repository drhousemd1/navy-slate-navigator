import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import webpush from "https://esm.sh/web-push@3.6.6";

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
  platform?: 'web' | 'native';
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

    const { targetUserId, type, title, body, data: notificationData, platform = 'web' }: NotificationRequest = await req.json();

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

    if (platform === 'native') {
      return await sendNativePushNotification(supabase, targetUserId, title, body, notificationData);
    } else {
      return await sendWebPushNotification(supabase, targetUserId, title, body, notificationData, type, vapidPublicKey, vapidPrivateKey);
    }

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

async function sendWebPushNotification(
  supabase: any,
  targetUserId: string,
  title: string,
  body: string,
  notificationData: any,
  type: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
) {
  // Get user's push subscriptions
  const { data: subscriptions, error: subsError } = await supabase
    .from('user_push_subscriptions')
    .select('*')
    .eq('user_id', targetUserId);

  if (subsError || !subscriptions || subscriptions.length === 0) {
    console.log(`No web push subscriptions found for user ${targetUserId}`);
    return new Response(
      JSON.stringify({ message: 'No web push subscriptions found' }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }

  // Configure VAPID details for web-push
  webpush.setVapidDetails(
    'mailto:support@example.com',
    vapidPublicKey,
    vapidPrivateKey
  );

  // Send push notifications
  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        };

        const payload = JSON.stringify({
          title,
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: type,
          data: notificationData
        });

        await webpush.sendNotification(pushSubscription, payload);
        
        console.log(`Web push notification sent successfully to subscription ${subscription.id}`);
        return { subscriptionId: subscription.id, success: true };
      } catch (error) {
        console.error(`Error sending to subscription ${subscription.id}:`, error);
        
        // If subscription is invalid, remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabase
            .from('user_push_subscriptions')
            .delete()
            .eq('id', subscription.id);
          console.log(`Removed invalid subscription ${subscription.id}`);
        }
        
        return { subscriptionId: subscription.id, success: false, error: error.message };
      }
    })
  );

  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.length - successful;

  console.log(`Web push notifications sent: ${successful} successful, ${failed} failed`);

  return new Response(
    JSON.stringify({ 
      message: 'Web push notifications processed',
      successful,
      failed,
      total: results.length
    }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    }
  );
}

async function sendNativePushNotification(
  supabase: any,
  targetUserId: string,
  title: string,
  body: string,
  notificationData: any
) {
  // Get user's native push token
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('id', targetUserId)
    .single();

  if (profileError || !profile?.push_token) {
    console.log(`No native push token found for user ${targetUserId}`);
    return new Response(
      JSON.stringify({ message: 'No native push token found' }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }

  // For now, we'll log that native push would be sent
  // In a real implementation, you would use FCM for Android and APNs for iOS
  console.log('Would send native push notification to token:', profile.push_token);
  console.log('Notification:', { title, body, data: notificationData });

  // TODO: Implement actual FCM/APNs sending logic here
  // This requires setting up Firebase/Apple credentials

  return new Response(
    JSON.stringify({ success: true, message: 'Native notification queued (not implemented yet)' }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    }
  );
};

serve(serve_handler);