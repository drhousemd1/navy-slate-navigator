import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationData {
  title: string;
  body: string;
  type: 'ruleBroken' | 'taskCompleted' | 'rewardPurchased' | 'rewardRedeemed' | 'punishmentPerformed' | 'wellnessUpdated';
  url?: string;
  payload?: Record<string, any>;
  requireInteraction?: boolean;
  targetUserId?: string; // Optional: send to specific user, defaults to authenticated user
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { title, body, type, url, payload, requireInteraction, targetUserId }: NotificationData = await req.json();

    if (!title || !body || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, body, type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine target user (default to authenticated user)
    const userId = targetUserId || user.id;

    // Check if user has access to send notifications to target user
    // (either same user or linked partner)
    if (userId !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('linked_partner_id')
        .eq('id', user.id)
        .single();

      if (!profile || profile.linked_partner_id !== userId) {
        return new Response(
          JSON.stringify({ error: 'Not authorized to send notifications to this user' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('user_push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch push subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No push subscriptions found for user', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's notification preferences from their profile or use defaults
    const defaultPreferences = {
      enabled: true,
      types: {
        ruleBroken: true,
        taskCompleted: true,
        rewardPurchased: true,
        rewardRedeemed: true,
        punishmentPerformed: true,
        wellnessUpdated: true,
      }
    };

    // Check if this notification type is enabled for the user
    // For now, we'll assume all types are enabled since preferences are stored in IndexedDB
    // In a future iteration, we could store preferences in the database as well
    
    const notificationPayload = {
      title,
      body,
      type,
      url: url || '/',
      payload: payload || {},
      requireInteraction: requireInteraction || false
    };

    let sentCount = 0;
    const failedSubscriptions: string[] = [];

    // Send push notifications to all user subscriptions
    for (const subscription of subscriptions) {
      try {
        console.log(`Sending notification to subscription: ${subscription.endpoint}`);
        console.log('Notification payload:', notificationPayload);
        
        // Create the push message payload
        const pushPayload = JSON.stringify({
          title: notificationPayload.title,
          body: notificationPayload.body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          url: notificationPayload.url,
          data: {
            type: notificationPayload.type,
            payload: notificationPayload.payload,
          },
          requireInteraction: notificationPayload.requireInteraction,
        });

        // Send the push notification using Web Push Protocol
        const pushResponse = await fetch(subscription.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
            'Authorization': `Bearer ${Deno.env.get('VAPID_PRIVATE_KEY') || 'development-key'}`,
            'Crypto-Key': `p256ecdsa=${Deno.env.get('VAPID_PUBLIC_KEY') || 'BEl62iUYgUivxIkv69yViEuiBIa40HEd0-3NqShQqFng_blTsrfCNnHR-f1z6J1KuEf8bjuMc2g6F8C9_1mNsNE'}`,
          },
          body: pushPayload,
        });

        if (pushResponse.ok) {
          sentCount++;
          console.log(`Successfully sent notification to ${subscription.endpoint}`);
        } else {
          console.error(`Failed to send notification: ${pushResponse.status} ${pushResponse.statusText}`);
          // If subscription is invalid (410 Gone), mark for removal
          if (pushResponse.status === 410) {
            failedSubscriptions.push(subscription.id);
          }
        }
        
      } catch (error) {
        console.error(`Failed to send notification to ${subscription.endpoint}:`, error);
        failedSubscriptions.push(subscription.id);
      }
    }

    // Remove failed subscriptions from the database
    if (failedSubscriptions.length > 0) {
      const { error: deleteError } = await supabase
        .from('user_push_subscriptions')
        .delete()
        .in('id', failedSubscriptions);

      if (deleteError) {
        console.error('Error removing failed subscriptions:', deleteError);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Push notifications sent successfully',
        sent: sentCount,
        failed: failedSubscriptions.length,
        total: subscriptions.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-push-notification function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});