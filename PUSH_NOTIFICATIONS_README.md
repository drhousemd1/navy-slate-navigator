# Push Notifications Requirements

This document outlines the push notification features that need to be implemented for the Navy Slate Navigator app.

## Required Push Notification Features

### Core Functionality
- **Cross-Platform Support**: Notifications must work on both desktop browsers and mobile PWA
- **Partner Integration**: Users should receive notifications about their partner's activities
- **User Preferences**: Users should be able to enable/disable notifications and choose which types to receive

### Notification Types Required

1. **Rule Violations** (`ruleBroken`)
   - Trigger: When a partner marks a rule as broken
   - Content: Rule name that was broken
   - Target: Partner of the user who broke the rule

2. **Task Completion** (`taskCompleted`)
   - Trigger: When a partner completes a task
   - Content: Task name that was completed
   - Target: Partner of the user who completed the task

3. **Reward Purchase** (`rewardPurchased`)
   - Trigger: When a partner purchases a reward (spends points to increase supply)
   - Content: Reward name that was purchased
   - Target: Partner of the user who purchased the reward

4. **Reward Redemption** (`rewardRedeemed`)
   - Trigger: When a partner redeems a reward (uses from supply)
   - Content: Reward name that was redeemed
   - Target: Partner of the user who redeemed the reward

5. **Punishment Applied** (`punishmentPerformed`)
   - Trigger: When a partner applies a punishment
   - Content: Punishment name that was applied
   - Target: Partner of the user who applied the punishment

6. **Wellness Update** (`wellnessUpdated`)
   - Trigger: When a partner updates their wellness score
   - Content: New wellness score value
   - Target: Partner of the user who updated their wellness

7. **Wellness Reminders** (`wellnessCheckin`)
   - Trigger: Scheduled reminders based on user's reminder settings
   - Content: Reminder to update wellness score
   - Target: User who set up the reminder

### Technical Requirements

#### Database Schema
- `user_push_subscriptions` table to store browser push subscription data
- `user_notification_preferences` table to store user notification settings
- Proper RLS policies to ensure data security

#### Service Worker
- Handle push events from the browser
- Display notifications with proper branding and actions
- Handle notification clicks to navigate to relevant app sections
- Support for mobile PWA notification features

#### Supabase Edge Functions
- `send-push-notification` function to send notifications to users
- VAPID key configuration for Web Push Protocol
- Partner authorization to prevent abuse
- Subscription management and cleanup

#### Frontend Integration
- Push subscription management hooks
- Notification preferences UI
- Integration with existing mutation hooks
- Proper error handling and user feedback

#### User Experience
- **Permission Requests**: Graceful handling of notification permission requests
- **Subscription Management**: Easy enable/disable of notifications
- **Granular Controls**: Individual control over notification types
- **Visual Feedback**: Clear indication of notification status

#### Mobile PWA Considerations
- Proper manifest.json configuration
- iOS and Android notification compatibility
- Offline notification handling
- Battery optimization considerations

### Integration Points

The push notification system needs to integrate with existing mutation hooks:
- `useApplyPunishment` (punishment applied notifications)
- `useBuySubReward` (reward purchased notifications)
- `useRedeemSubReward` (reward redeemed notifications)
- `useCreateRuleViolation` (rule broken notifications)
- `useToggleTaskCompletionMutation` (task completed notifications)
- `useUpsertWellbeing` (wellness updated notifications)

### Security Considerations
- Only partners should be able to send notifications to each other
- Subscription data should be properly secured with RLS
- VAPID keys should be stored securely in Supabase secrets
- Rate limiting to prevent notification spam

### Testing Requirements
- Test on major desktop browsers (Chrome, Firefox, Safari, Edge)
- Test on mobile devices (iOS Safari, Android Chrome)
- Test PWA installation and notifications
- Test offline/online notification behavior
- Test partner permission scenarios

## Implementation Notes

This system was previously implemented but had critical issues with caching, state management, and cross-platform compatibility. The new implementation must:

1. **Avoid Caching Issues**: Use direct Supabase calls without complex caching layers
2. **Ensure Cross-Platform Compatibility**: Test thoroughly on both desktop and mobile
3. **Implement Proper Error Handling**: Graceful fallbacks when notifications fail
4. **Follow Security Best Practices**: Proper RLS, partner verification, and data protection
5. **Provide Clear User Controls**: Intuitive UI for managing notification preferences

The goal is to create a reliable, secure, and user-friendly push notification system that enhances the partner experience without being intrusive or causing technical issues.