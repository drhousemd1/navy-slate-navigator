import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WellnessReminderPayload {
  userId?: string; // Optional: for manual testing
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

    console.log('[send-wellness-reminder] Function invoked');

    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5); // "HH:MM" format
    const currentDate = now.toISOString().split('T')[0]; // "YYYY-MM-DD" format

    // Parse request body for manual testing
    let specificUserId: string | null = null;
    if (req.method === 'POST') {
      try {
        const body: WellnessReminderPayload = await req.json();
        specificUserId = body.userId || null;
      } catch {
        // Ignore parsing errors for cron jobs
      }
    }

    // Query for wellness reminders that should be sent now
    let query = supabase
      .from('wellness_reminders')
      .select(`
        id,
        user_id,
        reminder_time,
        timezone,
        last_sent
      `)
      .eq('enabled', true);

    // If testing with specific user, filter by user_id
    if (specificUserId) {
      query = query.eq('user_id', specificUserId);
      console.log(`[send-wellness-reminder] Testing with specific user: ${specificUserId}`);
    } else {
      // For cron job, filter by time (allowing 5-minute window)
      const timeStart = currentTime;
      const timeParts = currentTime.split(':').map(Number);
      const endMinutes = timeParts[1] + 5;
      const timeEnd = `${timeParts[0].toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
      
      query = query
        .gte('reminder_time', `${timeStart}:00`)
        .lte('reminder_time', `${timeEnd}:59`)
        .or(`last_sent.is.null,last_sent.lt.${currentDate}T00:00:00Z`);
    }

    const { data: reminders, error: reminderError } = await query;

    if (reminderError) {
      console.error('[send-wellness-reminder] Error fetching reminders:', reminderError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch wellness reminders' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-wellness-reminder] Found ${reminders?.length || 0} reminders to process`);

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No wellness reminders to send at this time',
          processed: 0,
          currentTime 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sentCount = 0;
    let errorCount = 0;

    // Process each reminder
    for (const reminder of reminders) {
      try {
        console.log(`[send-wellness-reminder] Processing reminder for user: ${reminder.user_id}`);

        // Get user's push subscriptions
        const { data: subscriptions, error: subError } = await supabase
          .from('user_push_subscriptions')
          .select('*')
          .eq('user_id', reminder.user_id);

        if (subError) {
          console.error(`[send-wellness-reminder] Error fetching subscriptions for user ${reminder.user_id}:`, subError);
          errorCount++;
          continue;
        }

        if (!subscriptions || subscriptions.length === 0) {
          console.log(`[send-wellness-reminder] No push subscriptions found for user: ${reminder.user_id}`);
          continue;
        }

        // Send notification via the send-push-notification function
        const notificationPayload = {
          title: '🌟 Wellness Check-in Time',
          body: 'How are you feeling today? Take a moment to update your wellness score.',
          type: 'wellnessCheckin',
          url: '/wellbeing',
          requireInteraction: false,
          targetUserId: reminder.user_id
        };

        // Call the send-push-notification function
        const { error: notificationError } = await supabase.functions.invoke('send-push-notification', {
          body: notificationPayload
        });

        if (notificationError) {
          console.error(`[send-wellness-reminder] Error sending notification to user ${reminder.user_id}:`, notificationError);
          errorCount++;
          continue;
        }

        // Update last_sent timestamp
        const { error: updateError } = await supabase
          .from('wellness_reminders')
          .update({ last_sent: now.toISOString() })
          .eq('id', reminder.id);

        if (updateError) {
          console.error(`[send-wellness-reminder] Error updating last_sent for reminder ${reminder.id}:`, updateError);
          // Don't increment error count as notification was sent successfully
        }

        sentCount++;
        console.log(`[send-wellness-reminder] Successfully sent wellness reminder to user: ${reminder.user_id}`);

      } catch (error) {
        console.error(`[send-wellness-reminder] Unexpected error processing reminder for user ${reminder.user_id}:`, error);
        errorCount++;
      }
    }

    const response = {
      message: 'Wellness reminder processing completed',
      processed: reminders.length,
      sent: sentCount,
      errors: errorCount,
      currentTime,
      timestamp: now.toISOString()
    };

    console.log('[send-wellness-reminder] Processing completed:', response);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-wellness-reminder] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});