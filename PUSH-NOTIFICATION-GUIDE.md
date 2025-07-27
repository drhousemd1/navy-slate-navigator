# PUSH NOTIFICATION SYSTEM GUIDE

## SYSTEM ARCHITECTURE OVERVIEW

The push notification system consists of multiple components working together:

1. **Frontend Hooks**: `usePushNotifications.ts`, `usePushSubscription.ts`, `useSmartMessageNotifications.ts`
2. **Task Completion Flow**: `useToggleTaskCompletionMutation.ts`
3. **Partner Helper**: `usePartnerHelper.ts`
4. **Edge Functions**: `send-push-notification`, `get-vapid-public-key`
5. **Database Tables**: `user_push_subscriptions`, `user_notification_preferences`, `profiles`

## COMPLETE CODE FLOW ANALYSIS

### Step 1: Task Completion Trigger
When a task is completed, the flow starts in `useToggleTaskCompletionMutation.ts`:

```typescript
// Line 259-275: onSuccess callback
const partnerId = await getPartnerId();
if (partnerId && variables.completed) {
  const success = await sendTaskCompletedNotification(
    partnerId,
    variables.task.title,
    variables.pointsValue
  );
  if (success) {
    logger.info('Push notification sent successfully');
  } else {
    logger.warn('Failed to send push notification');
  }
}
```

### Step 2: Partner ID Resolution
`usePartnerHelper.ts` fetches the linked partner ID:

```typescript
const { data: profile, error } = await supabase
  .from('profiles')
  .select('linked_partner_id')
  .eq('id', user.id)
  .single();

return profile?.linked_partner_id || null;
```

### Step 3: Push Notification Call
`usePushNotifications.ts` handles the notification sending:

```typescript
const sendTaskCompletedNotification = async (targetUserId: string, taskName: string, points: number) => {
  return sendNotification({
    targetUserId,
    type: 'taskCompleted',
    title: 'Task Completed',
    body: `Task completed: ${taskName} (+${points} points)`,
    data: { type: 'task_completed', taskName, points },
  });
};
```

### Step 4: Edge Function Invocation
The `sendNotification` function calls the edge function:

```typescript
const { data: result, error } = await supabase.functions.invoke('send-push-notification', {
  body: {
    targetUserId,
    type,
    title,
    body,
    data,
  },
});
```

### Step 5: Edge Function Processing
`send-push-notification/index.ts` processes the request:

1. Fetches user email for VAPID JWT
2. Gets user's push subscriptions from database
3. Sends push notification to each subscription endpoint
4. Removes expired subscriptions

## CURRENT ISSUES IDENTIFIED

### Issue #1: Missing Edge Function Calls
**Status**: CRITICAL
**Description**: Despite having linked partners and push subscriptions, the edge function is never being called.

**Evidence**:
- Edge function logs show no recent invocations
- User reports no notifications received
- All components appear to be properly connected

**Potential Causes**:
1. `getPartnerId()` returning null despite linked partner existing
2. `if (variables.completed)` condition not being met
3. Silent error in `sendTaskCompletedNotification` function
4. Network/connectivity issues preventing edge function invocation

### Issue #2: VAPID JWT Configuration
**Status**: PARTIALLY RESOLVED
**Description**: Edge function was using hardcoded email instead of user's email for VAPID JWT.

**Resolution**: Updated to use target user's email from auth.users table.

## CHANGE LOG - LAST 72 HOURS

### Changes Made to Push Notification System:

#### Change #1: VAPID Email Fix
**File**: `supabase/functions/send-push-notification/index.ts`
**Date**: Recent (based on conversation)
**Description**: 
- Replaced hardcoded VAPID email with dynamic user email
- Added user email fetching from auth.users table
- Updated `sendPushNotification` function signature to include `userEmail` parameter

**Code Changes**:
```typescript
// BEFORE:
const vapidEmail = (Deno.env.get('VAPID_EMAIL') || 'noreply@example.com').trim();
const vapidJWT = await buildVapidJWT(audience, `mailto:${vapidEmail}`);

// AFTER:
const vapidJWT = await buildVapidJWT(audience, `mailto:${userEmail.trim()}`);
```

#### Change #2: Enhanced Edge Function Logging
**File**: `supabase/functions/send-push-notification/index.ts`
**Description**: Added comprehensive logging throughout the edge function for better debugging.

#### Change #3: User Email Retrieval
**File**: `supabase/functions/send-push-notification/index.ts`
**Description**: Added code to fetch user's email from Supabase Auth for VAPID JWT generation.

## DEBUGGING STEPS

### Step 1: Verify Components
1. Check if user has linked partner: `SELECT linked_partner_id FROM profiles WHERE id = 'user_id'`
2. Check if partner has push subscriptions: `SELECT * FROM user_push_subscriptions WHERE user_id = 'partner_id'`
3. Verify notification preferences: `SELECT * FROM user_notification_preferences WHERE user_id = 'partner_id'`

### Step 2: Test Task Completion Flow
1. Add console.log statements in `useToggleTaskCompletionMutation.ts` before `getPartnerId()` call
2. Add console.log in `getPartnerId()` function to verify return value
3. Add console.log before `sendTaskCompletedNotification()` call
4. Add console.log in `sendNotification()` function before edge function call

### Step 3: Monitor Edge Function
1. Check edge function logs in Supabase dashboard
2. Verify VAPID keys are properly set in edge function secrets
3. Test edge function directly via Supabase dashboard

### Step 4: Test Push Subscription
1. Use browser developer tools to check service worker registration
2. Verify push subscription exists in browser
3. Test manual push notification using browser's Push API

## CURRENT STATUS

### ✅ WORKING COMPONENTS:
1. Push subscription management (`usePushSubscription.ts`)
2. VAPID key generation (`get-vapid-public-key` edge function)
3. Partner linking system (`usePartnerHelper.ts`)
4. Database schema and RLS policies
5. Edge function deployment and basic functionality

### ❌ NOT WORKING:
1. **CRITICAL**: Task completion notifications not triggering edge function calls
2. Edge function never receives requests despite task completions
3. No push notifications delivered to devices

### 🔍 NEEDS INVESTIGATION:
1. Why `getPartnerId()` might be returning null despite linked partner existing
2. Whether `variables.completed` condition is being met in task completion flow
3. Silent failures in the notification chain
4. Network connectivity between frontend and edge functions

## NEXT DEBUGGING STEPS

1. **Add comprehensive logging** to every step of the notification flow
2. **Test each component individually** to isolate the failure point
3. **Verify edge function receives ANY requests** during task completion
4. **Check browser network tab** for failed edge function calls
5. **Test with manual edge function invocation** to verify functionality

## TECHNICAL SPECIFICATIONS

### Database Tables:
- `user_push_subscriptions`: Stores device push subscription data
- `user_notification_preferences`: Stores user notification settings
- `profiles`: Contains user data including `linked_partner_id`

### Edge Functions:
- `send-push-notification`: Main notification sending function
- `get-vapid-public-key`: Returns VAPID public key for subscription

### VAPID Configuration:
- Public key: Stored in edge function secrets
- Private key: Stored in edge function secrets
- JWT: Generated using user's email address

### Push Services Supported:
- Firefox (Mozilla)
- Chrome/Edge (FCM)
- Safari (Apple Push Service)
- Windows (WNS)

---

**Last Updated**: Current session
**Status**: CRITICAL ISSUE - Edge function not being called despite proper setup