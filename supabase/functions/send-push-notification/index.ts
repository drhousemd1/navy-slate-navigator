import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationData {
  title: string;
  body: string;
  type: 'taskReminders' | 'ruleViolations' | 'rewardAvailable' | 'punishmentAssigned' | 'partnerActivity';
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
        taskReminders: true,
        ruleViolations: true,
        rewardAvailable: true,
        punishmentAssigned: true,
        partnerActivity: true,
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
        // Note: This is a placeholder for actual push sending
        // In a real implementation, you would use a service like:
        // - Firebase Cloud Messaging
        // - Web Push Protocol with VAPID keys
        // - A third-party service like Pusher or Ably
        
        console.log(`Sending notification to subscription: ${subscription.endpoint}`);
        console.log('Notification payload:', notificationPayload);
        
        // For now, we'll simulate a successful send
        sentCount++;
        
        // In a real implementation, you would:
        // 1. Use the subscription.endpoint, subscription.p256dh_key, and subscription.auth_key
        // 2. Create a proper push message with VAPID authentication
        // 3. Send the HTTP request to the push service
        // 4. Handle any errors (invalid subscriptions should be removed)
        
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