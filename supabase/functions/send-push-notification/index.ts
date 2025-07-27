// Simplified push notification edge function - supabase/functions/send-push-notification/index.ts
// This version sends unencrypted notifications to avoid encryption issues

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Base64 URL conversion helpers
function base64UrlToBase64(base64url: string): string {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  return base64 + padding;
}

function uint8ArrayToBase64Url(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Build VAPID JWT token
async function buildVapidJWT(audience: string, subject: string): Promise<string> {
  console.log("[VAPID] Building JWT for audience:", audience);

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error('Missing VAPID keys');
  }

  // JWT header
  const header = {
    typ: 'JWT',
    alg: 'ES256'
  };

  // JWT payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 3600, // 1 hour from now
    sub: subject,
    iat: now
  };

  // Encode header and payload
  const encodedHeader = btoa(JSON.stringify(header))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const encodedPayload = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  try {
    // Try PKCS8 format first
    const privateKeyBytes = Uint8Array.from(atob(base64UrlToBase64(vapidPrivateKey)), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyBytes,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    // Sign the token
    const signatureBuffer = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      new TextEncoder().encode(unsignedToken)
    );

    const signature = new Uint8Array(signatureBuffer);

    // Convert DER signature to raw format for JWT
    let rawSignature: Uint8Array;
    if (signature.length > 64 && signature[0] === 0x30) {
      // Parse DER format
      let offset = 2;
      if (signature[offset] === 0x02) {
        offset++;
        const rLength = signature[offset++];
        const r = signature.slice(offset, offset + rLength);
        offset += rLength;
        
        if (signature[offset] === 0x02) {
          offset++;
          const sLength = signature[offset++];
          const s = signature.slice(offset, offset + sLength);
          
          // Pad to 32 bytes each
          const rPadded = new Uint8Array(32);
          rPadded.set(r.slice(-32), 32 - Math.min(r.length, 32));
          
          const sPadded = new Uint8Array(32);
          sPadded.set(s.slice(-32), 32 - Math.min(s.length, 32));
          
          rawSignature = new Uint8Array(64);
          rawSignature.set(rPadded, 0);
          rawSignature.set(sPadded, 32);
        } else {
          throw new Error('Invalid DER signature format');
        }
      } else {
        throw new Error('Invalid DER signature format');
      }
    } else {
      // Already in raw format
      rawSignature = signature;
    }

    const encodedSignature = uint8ArrayToBase64Url(rawSignature);
    return `${unsignedToken}.${encodedSignature}`;

  } catch (error) {
    console.error("[VAPID] PKCS8 import failed:", error);
    throw new Error(`Failed to build VAPID JWT: ${error.message}`);
  }
}

// Send push notification (simplified - no encryption)
async function sendPushNotification(
  endpoint: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
): Promise<{ success: boolean; shouldRemove?: boolean }> {
  console.log("[PUSH] Sending to endpoint:", endpoint.substring(0, 50) + "…");

  try {
    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;

    // Determine push service
    let pushService = 'unknown';
    if (endpoint.includes('android.googleapis.com') || endpoint.includes('fcm.googleapis.com')) {
      pushService = 'FCM';
    } else if (endpoint.includes('web.push.apple.com')) {
      pushService = 'Apple';
    } else if (endpoint.includes('notify.windows.com')) {
      pushService = 'WNS';
    } else if (endpoint.includes('push.mozilla.org')) {
      pushService = 'Mozilla';
    }

    console.log(`[PUSH] Push service: ${pushService}`);

    // Create notification payload
    const notificationPayload = {
      title,
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data
    };

    // Build VAPID JWT
    const vapidEmail = Deno.env.get('VAPID_EMAIL') || 'noreply@example.com';
    const vapidJWT = await buildVapidJWT(audience, `mailto:${vapidEmail}`);
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;

    // Prepare headers
    const headers: Record<string, string> = {
      'Authorization': `WebPush ${vapidJWT}`,
      'Crypto-Key': `p256ecdsa=${vapidPublicKey}`,
      'Content-Type': 'application/json',
      'TTL': '86400'
    };

    // Send as plain JSON (no encryption)
    const payloadString = JSON.stringify(notificationPayload);
    console.log(`[PUSH] Payload: ${payloadString}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: payloadString
    });

    console.log(`[PUSH] Response status: ${response.status}`);

    if (!response.ok) {
      const responseText = await response.text().catch(() => '');
      console.error(`[PUSH] Error response: ${responseText}`);
      
      // Handle specific error cases
      if (response.status === 410 || response.status === 404) {
        console.log(`[PUSH] Subscription expired/invalid (${response.status})`);
        return { success: false, shouldRemove: true };
      }
      
      return { success: false, shouldRemove: false };
    }

    console.log(`[PUSH] Push sent successfully`);
    return { success: true };

  } catch (error) {
    console.error(`[PUSH] Send failed:`, error);
    return { success: false, shouldRemove: false };
  }
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== PUSH NOTIFICATION FUNCTION START ===");

  try {
    const { targetUserId, type, title, body, data } = await req.json();

    if (!targetUserId) {
      return jsonResponse({ error: 'targetUserId is required' }, 400);
    }

    // Test mode for quick debugging
    if (targetUserId === 'test' && title === 'test') {
      console.log("[TEST] Test mode activated");
      return jsonResponse({ message: 'Test mode - no actual notifications sent', success: true });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[MAIN] Processing notification for user: ${targetUserId}`);
    console.log(`[MAIN] Notification type: ${type}`);
    console.log(`[MAIN] Title: ${title}`);
    console.log(`[MAIN] Body: ${body}`);

    // Get user's push subscriptions
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('user_push_subscriptions')
      .select('*')
      .eq('user_id', targetUserId);

    if (subscriptionsError) {
      console.error('[MAIN] Error fetching subscriptions:', subscriptionsError);
      return jsonResponse({ error: 'Failed to fetch push subscriptions' }, 500);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[MAIN] No push subscriptions found');
      return jsonResponse({ message: 'No push subscriptions found', sent: false });
    }

    console.log(`[MAIN] Found ${subscriptions.length} subscription(s)`);

    // Send to all subscriptions
    const results = [];
    const subscriptionsToRemove = [];

    for (const subscription of subscriptions) {
      try {
        const result = await sendPushNotification(
          subscription.endpoint,
          title || 'Navy Slate Navigator',
          body || 'New notification',
          { type, ...data }
        );
        
        results.push({
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          success: result.success
        });
        
        if (result.shouldRemove) {
          subscriptionsToRemove.push(subscription.id);
        }
        
      } catch (error) {
        console.error(`[MAIN] Failed to send to subscription ${subscription.id}:`, error);
        results.push({
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          success: false
        });
      }
    }

    // Remove invalid subscriptions
    if (subscriptionsToRemove.length > 0) {
      console.log(`[MAIN] Removing ${subscriptionsToRemove.length} invalid subscription(s)`);
      const { error: removeError } = await supabase
        .from('user_push_subscriptions')
        .delete()
        .in('id', subscriptionsToRemove);
      
      if (removeError) {
        console.error('[MAIN] Error removing invalid subscriptions:', removeError);
      }
    }

    const successCount = results.filter(r => r.success).length;

    console.log(`[MAIN] Sent ${successCount}/${results.length} notifications`);
    console.log("=== PUSH NOTIFICATION FUNCTION END ===");

    return jsonResponse({
      message: `Sent ${successCount}/${results.length} notifications`,
      sent: successCount > 0,
      results
    });

  } catch (error) {
    console.error('[MAIN] Error in push notification function:', error);
    return jsonResponse({ error: 'Internal server error', details: error.message }, 500);
  }
});