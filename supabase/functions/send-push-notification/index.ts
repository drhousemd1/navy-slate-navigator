import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.3";
import webpush from "https://esm.sh/web-push@3.5.2";

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

    // Configure web-push with VAPID details
    webpush.setVapidDetails(
      'mailto:admin@example.com',
      vapidPublicKey,
      vapidPrivateKey
    );

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

    // Send push notification using web-push library
    const sendWebPushNotification = async (subscription: any, payload: string): Promise<void> => {
      console.log('📤 Starting web push notification...');
      console.log('- Endpoint:', subscription.endpoint);
      console.log('- Payload length:', payload.length);
      
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        };

        console.log('🔧 Formatted subscription for web-push protocol');
        console.log('- Endpoint:', pushSubscription.endpoint);

        await webpush.sendNotification(pushSubscription, payload);
        console.log('✅ Push notification sent successfully via web-push library');
        
      } catch (error: any) {
        console.error('❌ Error sending push notification:', error);
        console.error('- Error name:', error.name);
        console.error('- Error message:', error.message);
        console.error('- Status code:', error.statusCode);
        
        // Handle expired/invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log('🗑️ Subscription appears to be invalid, removing from database...');
          await supabase
            .from('user_push_subscriptions')
            .delete()
            .eq('id', subscription.id);
          console.log('✅ Invalid subscription removed');
        }
        
        throw error;
      }
    };

    // Send push notifications
    console.log('🚀 Starting to send push notifications to', subscriptions.length, 'subscriptions...');
    
    let successCount = 0;
    let failedCount = 0;

    const payloadString = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: type,
      data: notificationData
    });

    console.log('📦 Payload created:', payloadString);

    for (let i = 0; i < subscriptions.length; i++) {
      const subscription = subscriptions[i];
      
      console.log(`\n📱 Processing subscription ${i + 1}/${subscriptions.length}:`);
      console.log('- ID:', subscription.id);
      
      try {
        await sendWebPushNotification(subscription, payloadString);
        successCount++;
        console.log(`✅ Notification ${i + 1} sent successfully`);
      } catch (error: any) {
        failedCount++;
        console.error(`❌ Failed to send notification ${i + 1}:`, error.message);
      }
    }

    console.log('\n📈 Final Results:');
    console.log(`- ✅ Successful: ${successCount}`);
    console.log(`- ❌ Failed: ${failedCount}`);
    console.log(`- 📊 Total: ${subscriptions.length}`);

    return new Response(
      JSON.stringify({ 
        message: 'Push notifications processed',
        successful: successCount,
        failed: failedCount,
        total: subscriptions.length
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