import { useState, useCallback } from 'react';
import { useUpdateNotificationPreferences } from '@/data/notifications';
import type { NotificationPreferences } from '@/data/notifications/types';

// Simple VAPID key for development
const VAPID_PUBLIC_KEY = "BEl62iUYgUivxIkv69yViEuiBIa40HEd0-3NqShQqFng_blTsrfCNnHR-f1z6J1KuEf8bjuMc2g6F8C9_1mNsNE";

export function useNotificationManager(preferences: NotificationPreferences) {
  const [isProcessing, setIsProcessing] = useState(false);
  const updatePreferences = useUpdateNotificationPreferences();

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

      console.log('Push subscription created:', subscription);
      return true;
    } catch (error) {
      console.error('Failed to enable push notifications:', error);
      return false;
    }
  }, []);

  const disablePushNotifications = useCallback(async (): Promise<boolean> => {
    try {
      if (!('serviceWorker' in navigator)) {
        return true; // No service worker, nothing to disable
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        console.log('Push subscription cancelled');
      }
      
      return true;
    } catch (error) {
      console.error('Failed to disable push notifications:', error);
      return false;
    }
  }, []);

  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (isProcessing) return false;
    
    setIsProcessing(true);
    try {
      const pushEnabled = await enablePushNotifications();
      
      // Update preferences regardless of push notification success
      const newPreferences: NotificationPreferences = {
        ...preferences,
        enabled: true,
      };

      updatePreferences.mutate({ preferences: newPreferences });
      return true;
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [preferences, updatePreferences, enablePushNotifications, isProcessing]);

  const disableNotifications = useCallback(async (): Promise<boolean> => {
    if (isProcessing) return false;
    
    setIsProcessing(true);
    try {
      await disablePushNotifications();
      
      const newPreferences: NotificationPreferences = {
        ...preferences,
        enabled: false,
      };

      updatePreferences.mutate({ preferences: newPreferences });
      return true;
    } catch (error) {
      console.error('Failed to disable notifications:', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [preferences, updatePreferences, disablePushNotifications, isProcessing]);

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
    isProcessing,
  };
}