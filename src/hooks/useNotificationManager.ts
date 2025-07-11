import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateNotificationPreferences, useCreatePushSubscription, useDeletePushSubscription } from '@/data/notifications';
import type { NotificationPreferences } from '@/data/notifications/types';
import { useAuth } from '@/contexts/AuthContext';

// Simple VAPID key for development
const VAPID_PUBLIC_KEY = "BEl62iUYgUivxIkv69yViEuiBIa40HEd0-3NqShQqFng_blTsrfCNnHR-f1z6J1KuEf8bjuMc2g6F8C9_1mNsNE";

export function useNotificationManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const updatePreferences = useUpdateNotificationPreferences();
  const createPushSubscription = useCreatePushSubscription();
  const deletePushSubscription = useDeletePushSubscription();

  // Helper to get current preferences from query cache
  const getCurrentPreferences = useCallback((): NotificationPreferences | undefined => {
    return queryClient.getQueryData<NotificationPreferences>(['notification-preferences', user?.id]);
  }, [queryClient, user?.id]);

  const enablePushNotifications = useCallback(async (): Promise<boolean> => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push notifications not supported');
        return false;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY,
      });

      // Store subscription in database
      const subscriptionData = subscription.toJSON();
      if (subscriptionData.keys?.p256dh && subscriptionData.keys?.auth && subscriptionData.endpoint) {
        await createPushSubscription.mutateAsync({
          endpoint: subscriptionData.endpoint,
          p256dhKey: subscriptionData.keys.p256dh,
          authKey: subscriptionData.keys.auth,
        });
      }

      console.log('Push subscription created and stored:', subscription);
      return true;
    } catch (error) {
      console.error('Failed to enable push notifications:', error);
      return false;
    }
  }, [createPushSubscription]);

  const disablePushNotifications = useCallback(async (): Promise<boolean> => {
    try {
      if (!('serviceWorker' in navigator)) {
        return true; // No service worker, nothing to disable
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Remove from database first
        await deletePushSubscription.mutateAsync(subscription.endpoint);
        // Then unsubscribe
        await subscription.unsubscribe();
        console.log('Push subscription cancelled and removed from database');
      }
      
      return true;
    } catch (error) {
      console.error('Failed to disable push notifications:', error);
      return false;
    }
  }, [deletePushSubscription]);

  const enableNotifications = useCallback(async () => {
    const currentPreferences = getCurrentPreferences();
    if (!currentPreferences) {
      console.warn('No preferences available for enabling notifications');
      return;
    }

    console.log('Enabling notifications with current preferences:', currentPreferences);

    // Update preferences immediately with optimistic update
    const newPreferences: NotificationPreferences = {
      ...currentPreferences,
      enabled: true,
    };

    try {
      // Handle push notifications first, then update preferences
      const success = await enablePushNotifications();
      if (success) {
        updatePreferences.mutate({ preferences: newPreferences });
      } else {
        console.warn('Push notification setup failed, updating preferences anyway');
        updatePreferences.mutate({ preferences: newPreferences });
      }
    } catch (error) {
      console.warn('Push notification setup failed:', error);
      updatePreferences.mutate({ preferences: newPreferences });
    }
  }, [getCurrentPreferences, updatePreferences, enablePushNotifications]);

  const disableNotifications = useCallback(async () => {
    const currentPreferences = getCurrentPreferences();
    if (!currentPreferences) {
      console.warn('No preferences available for disabling notifications');
      return;
    }

    console.log('Disabling notifications with current preferences:', currentPreferences);

    // Update preferences immediately with optimistic update
    const newPreferences: NotificationPreferences = {
      ...currentPreferences,
      enabled: false,
    };

    try {
      // Handle push notifications cleanup first, then update preferences
      await disablePushNotifications();
      updatePreferences.mutate({ preferences: newPreferences });
    } catch (error) {
      console.warn('Push notification cleanup failed:', error);
      // Still update preferences even if cleanup fails
      updatePreferences.mutate({ preferences: newPreferences });
    }
  }, [getCurrentPreferences, updatePreferences, disablePushNotifications]);

  const updateNotificationType = useCallback(
    (type: keyof NotificationPreferences['types'], enabled: boolean) => {
      const currentPreferences = getCurrentPreferences();
      if (!currentPreferences) {
        console.warn('No preferences available for updating notification type');
        return;
      }

      console.log(`Updating notification type ${type} to ${enabled} with current preferences:`, currentPreferences);

      const newPreferences: NotificationPreferences = {
        ...currentPreferences,
        types: {
          ...currentPreferences.types,
          [type]: enabled,
        },
      };

      updatePreferences.mutate({ preferences: newPreferences });
    },
    [getCurrentPreferences, updatePreferences]
  );

  return {
    enableNotifications,
    disableNotifications,
    updateNotificationType,
  };
}