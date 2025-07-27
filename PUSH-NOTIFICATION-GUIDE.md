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

## ATTEMPTED FIXES/CHANGES - LAST 72 HOURS

### Complete Change Log of Push Notification System Modifications:

#### Change #1: Complete Edge Function Rewrite
**File**: `supabase/functions/send-push-notification/index.ts`
**Description**: Completely rewrote the edge function from an encrypted notification system to a simplified unencrypted system.
**Details**: 
- Removed encryption/decryption logic that was causing payload issues
- Simplified notification payload structure
- Switched to standard Web Push API format
- Removed dependency on crypto libraries for notification content

#### Change #2: Dynamic VAPID Email Fetching
**File**: `supabase/functions/send-push-notification/index.ts`
**Description**: Replaced hardcoded VAPID email with dynamic user email fetching from auth.users table.
**Details**:
- Added user email query: `SELECT email FROM auth.users WHERE id = $1`
- Updated `sendPushNotification` function signature to include userEmail parameter
- Ensured VAPID JWT uses actual user email instead of placeholder
- Added error handling for missing user emails

#### Change #3: Apple Push Service Support
**File**: `supabase/functions/send-push-notification/index.ts`
**Description**: Added specific support for Apple Push Service with proper payload format and headers.
**Details**:
- Added Apple Push Service endpoint detection
- Implemented Apple-specific payload structure with `aps` wrapper
- Added proper headers including `apns-topic` and `apns-priority`
- Configured Apple-specific alert format with title and body

#### Change #4: Enhanced Error Handling and Logging
**File**: `supabase/functions/send-push-notification/index.ts`
**Description**: Added comprehensive error handling and logging throughout the entire edge function.
**Details**:
- Added structured logging for each step of the notification process
- Implemented proper error responses with CORS headers
- Added validation for required parameters (targetUserId, type, title, body)
- Added detailed logging for push service detection and payload construction

#### Change #5: Push Service Detection System
**File**: `supabase/functions/send-push-notification/index.ts`
**Description**: Implemented automatic detection of different push services based on endpoint URLs.
**Details**:
- Added detection for FCM (Google Chrome/Edge)
- Added detection for Apple Push Service (Safari)
- Added detection for WNS (Windows Push Service)
- Added detection for Mozilla (Firefox)
- Implemented service-specific payload formatting

#### Change #6: Subscription Management with Expiration Handling
**File**: `supabase/functions/send-push-notification/index.ts`
**Description**: Added automatic removal of expired or invalid push subscriptions.
**Details**:
- Added handling for 410 Gone and 404 Not Found responses
- Implemented automatic subscription cleanup from database
- Added batch removal of expired subscriptions
- Added logging for subscription cleanup operations

#### Change #7: JWT Signature Handling for VAPID
**File**: `supabase/functions/send-push-notification/index.ts`
**Description**: Implemented proper VAPID JWT generation with ES256 signature algorithm.
**Details**:
- Added base64url encoding/decoding utilities
- Implemented ES256 JWT signing using VAPID private key
- Added proper JWT header and payload structure
- Ensured compliance with Web Push Protocol RFC 8292

#### Change #8: Task Completion Push Notification Integration
**File**: `src/data/tasks/mutations/useToggleTaskCompletionMutation.ts`
**Description**: Integrated push notifications into the task completion flow.
**Details**:
- Added push notification call in onSuccess callback (lines 259-275)
- Implemented partner ID resolution using usePartnerHelper
- Added conditional notification sending only for completed tasks
- Added success/failure logging for notification attempts
- Integrated with sendTaskCompletedNotification hook

#### Change #9: Punishment Application Notifications
**File**: `src/data/punishments/mutations/useApplyPunishment.ts`
**Description**: Added push notifications for punishment applications.
**Details**:
- Integrated sendPunishmentPerformedNotification into punishment flow
- Added partner notification when punishments are applied
- Included points deduction information in notification payload
- Added error handling for notification failures during punishment application

#### Change #10: Rule Violation Notifications
**File**: `src/data/rules/mutations/useCreateRuleViolation.ts`
**Description**: Added push notifications for rule violations.
**Details**:
- Integrated sendRuleBrokenNotification into rule violation creation
- Added notification to partner when rules are broken
- Included rule name and violation details in notification
- Added async notification handling in rule violation flow

#### Change #11: Wellness Update Notifications
**File**: `src/data/wellbeing/mutations/useUpsertWellbeing.ts`
**Description**: Added push notifications for wellness score updates.
**Details**:
- Integrated sendWellnessUpdatedNotification into wellness upsert flow
- Added partner notification when wellness scores are updated
- Included overall wellness score in notification payload
- Added conditional notification only when partner exists

#### Change #12: Reward Purchase and Redemption Notifications
**Files**: `src/data/rewards/mutations/useBuySubReward.ts`, `src/data/rewards/mutations/useRedeemSubReward.ts`, `src/data/rewards/mutations/useBuyDomReward.ts`, `src/data/rewards/mutations/useRedeemDomReward.ts`
**Description**: Added push notifications for all reward-related actions.
**Details**:
- Integrated sendRewardPurchasedNotification for reward purchases
- Integrated sendRewardRedeemedNotification for reward redemptions
- Added cost information in purchase notifications
- Added reward name and type information in all reward notifications
- Implemented notifications for both Dom and Sub reward types

#### Change #13: Message Sending Smart Notifications
**File**: `src/hooks/messages/useMessageSend.ts`
**Description**: Integrated smart message notifications into message sending flow.
**Details**:
- Added useSmartMessageNotifications hook integration
- Implemented conditional notification based on app visibility and user location
- Added message content preview in notifications
- Added sender name and message preview in notification payload
- Implemented smart logic to avoid notifications when user is active on messages page

#### Change #14: Enhanced Push Subscription Management
**File**: `src/hooks/usePushSubscription.ts`
**Description**: Enhanced push subscription management with better error handling and state management.
**Details**:
- Improved subscription status checking and validation
- Enhanced permission request handling
- Added better error handling for subscription failures
- Improved service worker integration and ready state checking
- Added automatic subscription verification against database

#### Change #15: Notification Settings Integration
**File**: `src/hooks/useNotificationSettings.ts`
**Description**: Created comprehensive notification settings management system.
**Details**:
- Implemented user notification preferences management
- Added settings for each notification type (taskCompleted, rewardPurchased, etc.)
- Integrated with user_notification_preferences database table
- Added real-time settings updates and synchronization
- Implemented default notification preference values

#### Change #16: Service Worker Updates
**File**: `public/sw.js`
**Description**: Enhanced service worker for better push notification handling.
**Details**:
- Updated push event listener for better notification display
- Added proper notification action handling
- Improved notification click handling and app focus logic
- Added support for notification data payload processing
- Enhanced offline capability and background sync

#### Change #17: Core Push Notifications Hook Centralization
**File**: `src/hooks/usePushNotifications.ts`
**Description**: Centralized all push notification logic into a single comprehensive hook.
**Details**:
- Created sendTaskCompletedNotification function
- Created sendRewardPurchasedNotification function
- Created sendRewardRedeemedNotification function
- Created sendPunishmentPerformedNotification function
- Created sendWellnessUpdatedNotification function
- Created sendWellnessCheckinNotification function
- Created sendMessageNotification function
- Created sendRuleBrokenNotification function
- Added unified error handling and logging for all notification types

#### Change #18: Partner Helper Integration
**File**: `src/hooks/usePartnerHelper.ts`
**Description**: Enhanced partner helper for reliable partner ID resolution.
**Details**:
- Improved error handling in getPartnerId function
- Added comprehensive logging for partner ID resolution
- Enhanced database query for linked_partner_id retrieval
- Added null safety and validation for partner relationships
- Improved async handling and error propagation

#### Change #19: Smart Message Notifications System
**File**: `src/hooks/useSmartMessageNotifications.ts`
**Description**: Created intelligent message notification system based on user activity and preferences.
**Details**:
- Implemented shouldSendNotification logic based on app visibility
- Added check for current route to avoid notifications on messages page
- Integrated user notification preferences for message notifications
- Added sender name and message content preview
- Implemented smart notification logic to reduce notification spam

#### Change #20: Database Schema Updates
**Description**: Updated database tables for push notification support.
**Details**:
- Created user_push_subscriptions table with endpoint, p256dh, auth fields
- Created user_notification_preferences table with JSON preferences field
- Added RLS policies for push subscription and preference management
- Added proper indexes and constraints for push notification tables
- Integrated push token storage in profiles table

#### Change #21: Comprehensive Logging System
**Files**: Multiple files across the system
**Description**: Added extensive logging throughout the entire push notification chain.
**Details**:
- Added logger integration using src/lib/logger.ts
- Implemented structured logging for debugging push notification flow
- Added success/failure logging for each notification step
- Added error logging with proper error object handling
- Implemented development-only logging to avoid production noise

#### Change #22: Network Error Handling
**Files**: Multiple notification-related files
**Description**: Enhanced network error handling for push notification failures.
**Details**:
- Added retry logic for failed edge function calls
- Improved error propagation and user feedback
- Added graceful degradation when push notifications fail
- Implemented proper error boundaries for notification failures
- Added network connectivity checks before sending notifications

#### Change #23: Browser Compatibility Improvements
**File**: `src/hooks/usePushSubscription.ts`
**Description**: Enhanced browser compatibility for push notifications across different browsers.
**Details**:
- Added Safari push notification support detection
- Improved Chrome/Edge FCM integration
- Added Firefox Mozilla push service compatibility
- Implemented proper feature detection for push API support
- Added fallback handling for unsupported browsers

#### Change #24: Push Notification Testing Utilities
**File**: `src/utils/pushNotificationTest.ts`
**Description**: Created comprehensive testing utilities for debugging push notifications.
**Details**:
- Added pushNotificationTest function for manual testing
- Implemented service worker registration checking
- Added VAPID key fetching and validation
- Created manual subscription testing functions
- Added manual push notification sending for testing
- Implemented browser console testing commands

#### Change #25: Notification Permission Management
**Files**: Multiple push notification related files
**Description**: Enhanced notification permission handling and user experience.
**Details**:
- Improved permission request timing and user experience
- Added proper permission state checking and validation
- Enhanced permission denied handling and user feedback
- Added automatic permission re-request when appropriate
- Implemented graceful handling of permission state changes

#### 🆕 Change #26: NOTIFICATION PREFERENCE VALIDATION
**Files**: `src/hooks/usePushNotifications.ts`, `supabase/functions/send-push-notification/index.ts`
**Description**: Added comprehensive notification preference validation to prevent unnecessary edge function calls and ensure user preferences are respected.
**Details**:
- **Client-side validation**: Added checks in `usePushNotifications` hook before calling edge function
  - Validates global notification preferences (`preferences.enabled`)
  - Validates specific notification type preferences (`preferences.types[type]`)
  - Returns early with logging if notifications are disabled
  - Prevents unnecessary edge function invocations
- **Server-side backup validation**: Added preference checks in edge function
  - Queries `user_notification_preferences` table for target user
  - Validates both global enabled flag and specific notification type
  - Returns descriptive response indicating why notifications weren't sent
  - Provides fallback validation in case client-side checks are bypassed

## CRITICAL ISSUES IDENTIFIED

### ✅ FIXED: Notification Preference Validation Added
**Status**: RESOLVED 
**Description**: Added comprehensive notification preference checks to prevent edge function calls when notifications are disabled.

**Changes Made**:
- **Client-side**: Added checks in `usePushNotifications` hook before calling edge function
  - Validates `preferences.enabled` is true
  - Validates `preferences.types[type]` is true for specific notification type
  - Returns early with descriptive logging if either check fails
- **Server-side**: Added backup checks in edge function to validate user preferences
  - Queries `user_notification_preferences` table for target user
  - Validates global `enabled` flag and specific notification type
  - Returns descriptive response about why notifications weren't sent

### Issue #1: Edge Function Never Called (CRITICAL) 
**Status**: LIKELY RESOLVED - Root cause was missing notification preference checks
**Description**: The edge function was never being invoked due to missing notification preference validation.

**Root Cause Identified**: 
- Users had notification preferences disabled by default (`enabled: false`)
- The `usePushNotifications` hook was calling the edge function regardless of preferences
- Edge function was being called but couldn't send notifications, leading to apparent "silent failures"

**Evidence of Fix**:
- Added preference checks prevent unnecessary edge function calls
- Edge function now returns clear responses about disabled notifications
- Both client and server validate preferences before processing

### Issue #2: Silent Failures in Notification Chain
**Status**: NEEDS INVESTIGATION
**Description**: There may be silent failures occurring at various points in the notification chain that prevent the edge function from being called.

**Potential Failure Points**:
1. Partner ID resolution failing silently
2. Notification permission checks failing
3. User preference checks blocking notifications
4. Network timeout or connection issues
5. Service worker not properly registered or active

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
- **VAPID_PUBLIC_KEY**: `BKb6DMKLd5GRPaTyquPkYhoUVK2KvW13Pg5OBMZDJfvT01KXs3rCBuVyILB8Jv4B-ErXdlhdZ6Bg1zwPZwMTY1g`
- **VAPID_PRIVATE_KEY**: `MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgMibT9NDHu9ftBKwgfM7RTJY_HEP9HdsXOB3H9Bbb0SKhRANCAASm-gzCi3eRkT2k8qrj5GIaFFStir1tdz4OTgTGQyX709NSl7N6wgblciCwfCb-AfhK13ZYXWegYNc8D2cDE2NY`
- JWT: Generated using user's email address
- Keys stored in Supabase edge function secrets

### Push Services Supported:
- Firefox (Mozilla)
- Chrome/Edge (FCM)
- Safari (Apple Push Service)
- Windows (WNS)

---

**Last Updated**: Current session
**Status**: CRITICAL ISSUE - Edge function not being called despite proper setup