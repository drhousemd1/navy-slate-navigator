import { useCallback } from 'react';
import { useUpdateNotificationPreferences, useCreatePushSubscription, useDeletePushSubscription } from '@/data/notifications';
import type { NotificationPreferences } from '@/data/notifications/types';

// Simple VAPID key for development
const VAPID_PUBLIC_KEY = "BEl62iUYgUivxIkv69yViEuiBIa40HEd0-3NqShQqFng_blTsrfCNnHR-f1z6J1KuEf8bjuMc2g6F8C9_1mNsNE";

export function useNotificationManager(preferences: NotificationPreferences) {
  const updatePreferences = useUpdateNotificationPreferences();
  const createPushSubscription = useCreatePushSubscription();
  const deletePushSubscription = useDeletePushSubscription();

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

  const enableNotifications = useCallback(() => {
    // Update preferences immediately with optimistic update
    const newPreferences: NotificationPreferences = {
      ...preferences,
      enabled: true,
    };

    // Handle push notifications first, then update preferences
    enablePushNotifications().then((success) => {
      if (success) {
        updatePreferences.mutate({ preferences: newPreferences });
      }
    }).catch(error => {
      console.warn('Push notification setup failed:', error);
    });
  }, [preferences, updatePreferences, enablePushNotifications]);

  const disableNotifications = useCallback(() => {
    // Update preferences immediately with optimistic update
    const newPreferences: NotificationPreferences = {
      ...preferences,
      enabled: false,
    };

    // Handle push notifications cleanup first, then update preferences
    disablePushNotifications().then((success) => {
      updatePreferences.mutate({ preferences: newPreferences });
    }).catch(error => {
      console.warn('Push notification cleanup failed:', error);
      // Still update preferences even if cleanup fails
      updatePreferences.mutate({ preferences: newPreferences });
    });
  }, [preferences, updatePreferences, disablePushNotifications]);

  const updateNotificationType = useCallback(
    (type: keyof NotificationPreferences['types'], enabled: boolean) => {
      const newPreferences: NotificationPreferences = {
        ...preferences,
        types: {
          ...preferences.types,
          [type]: enabled,
        },
      };

      updatePreferences.mutate({ preferences: newPreferences });
    },
    [preferences, updatePreferences]
  );

  return {
    enableNotifications,
    disableNotifications,
    updateNotificationType,
  };
}