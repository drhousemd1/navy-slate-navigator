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

    // Simple VAPID JWT creation for testing
    const createSimpleVapidJWT = (endpoint: string): string => {
      const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      
      const payload = btoa(JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        sub: 'mailto:admin@example.com'
      })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      
      // For testing, we'll use a mock signature (this won't work for real notifications)
      const signature = 'mock-signature-for-testing';
      
      return `${header}.${payload}.${signature}`;
    };

    // Send empty push notification for testing
    const sendWebPushNotification = async (subscription: any): Promise<void> => {
      console.log('📤 Starting empty push notification test...');
      console.log('- Endpoint:', subscription.endpoint);
      
      try {
        // Create VAPID authorization header
        const jwt = createSimpleVapidJWT(subscription.endpoint);
        
        const headers: Record<string, string> = {
          'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
          'TTL': '86400'
        };

        console.log('📡 Sending empty push notification (testing delivery)...');
        console.log('- Method: POST');
        console.log('- Headers:', headers);
        console.log('- Body: empty (no payload)');
        
        const response = await fetch(subscription.endpoint, {
          method: 'POST',
          headers
          // No body - sending empty notification to test delivery
        });

        console.log('📨 Push service response:');
        console.log('- Status:', response.status);
        console.log('- Status Text:', response.statusText);
        
        if (!response.ok) {
          const responseText = await response.text();
          console.error('❌ Push service error:', response.status, responseText);
          
          // Handle expired/invalid subscriptions
          if (response.status === 410 || response.status === 404) {
            console.log('🗑️ Subscription appears invalid, removing...');
            await supabase
              .from('user_push_subscriptions')
              .delete()
              .eq('id', subscription.id);
            console.log('✅ Invalid subscription removed');
          }
          
          throw new Error(`Push service error: ${response.status} - ${responseText}`);
        }
        
        console.log('✅ Empty push notification sent successfully (testing delivery)');
        
      } catch (error: any) {
        console.error('❌ Error sending push notification:', error);
        throw error;
      }
    };

    // Send push notifications
    console.log('🚀 Starting to send push notifications to', subscriptions.length, 'subscriptions...');
    
    let successCount = 0;
    let failedCount = 0;

    console.log('🧪 Testing empty push notifications (no payload) to verify delivery...');
    console.log('📋 Expected behavior: Service worker should show default notification');

    for (let i = 0; i < subscriptions.length; i++) {
      const subscription = subscriptions[i];
      
      console.log(`\n📱 Processing subscription ${i + 1}/${subscriptions.length}:`);
      console.log('- ID:', subscription.id);
      console.log('- Endpoint:', subscription.endpoint);
      
      try {
        await sendWebPushNotification(subscription);
        successCount++;
        console.log(`✅ Empty notification ${i + 1} sent successfully`);
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