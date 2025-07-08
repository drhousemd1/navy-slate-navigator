import { useState, useEffect, useCallback } from 'react';
import localforage from 'localforage';
import { useAuth } from '@/contexts/auth';
import { logger } from '@/lib/logger';

export interface NotificationPreferences {
  enabled: boolean;
  types: {
    taskReminders: boolean;
    ruleViolations: boolean;
    rewardAvailable: boolean;
    punishmentAssigned: boolean;
    partnerActivity: boolean;
  };
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: false,
  types: {
    taskReminders: true,
    ruleViolations: true,
    rewardAvailable: true,
    punishmentAssigned: true,
    partnerActivity: true,
  }
};

// Create a dedicated store for notification preferences
const preferencesStore = localforage.createInstance({
  name: 'appData',
  storeName: 'notificationPreferences'
});

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);

  // Get user-specific key for preferences
  const getUserKey = useCallback((baseKey: string): string => {
    return user?.id ? `${baseKey}_${user.id}` : baseKey;
  }, [user?.id]);

  // Load preferences from IndexedDB
  const loadPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      const key = getUserKey('preferences');
      const savedPreferences = await preferencesStore.getItem<NotificationPreferences>(key);
      
      if (savedPreferences) {
        setPreferences(savedPreferences);
      } else {
        setPreferences(DEFAULT_PREFERENCES);
      }
      
      setError(null);
    } catch (err) {
      logger.error('[useNotificationPreferences] Error loading preferences:', err);
      setError('Failed to load notification preferences');
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setIsLoading(false);
    }
  }, [getUserKey]);

  // Save preferences to IndexedDB
  const savePreferences = useCallback(async (newPreferences: NotificationPreferences) => {
    try {
      const key = getUserKey('preferences');
      await preferencesStore.setItem(key, newPreferences);
      setPreferences(newPreferences);
      setError(null);
      logger.debug('[useNotificationPreferences] Preferences saved:', newPreferences);
    } catch (err) {
      logger.error('[useNotificationPreferences] Error saving preferences:', err);
      setError('Failed to save notification preferences');
      throw err;
    }
  }, [getUserKey]);

  // Check for existing push subscription
  const checkPushSubscription = useCallback(async () => {
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setPushSubscription(subscription);
        return subscription;
      }
      return null;
    } catch (err) {
      logger.error('[useNotificationPreferences] Error checking push subscription:', err);
      return null;
    }
  }, []);

  // Request notification permission and create push subscription
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    try {
      // Check if notifications are supported
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications are not supported in this browser');
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission was denied');
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription (using dummy VAPID key for now)
        const vapidPublicKey = 'BFuZ8C1FLpbdkXtNh5T1ZNq7i9rFOFJ9c3-dqGJ_1wOj4YpV7KxE3qM9n2P5s8U1r6_4v7w0z3A6B9C2E5F8H1I4J7K0L3M6N9O2P5Q8R1S4T7U0V3W6X9Y2Z5A8B1C4D7F0G3H6I9J2K5L8M1N4O7P0Q3R6S9T2U5V8W1X4Y7Z0A3B6C9D2E5F8G1H4I7J0K3L6M9N2O5P8Q1R4S7T0U3V6W9X2Y5Z8';
        
        const urlBase64ToUint8Array = (base64String: string) => {
          const padding = '='.repeat((4 - base64String.length % 4) % 4);
          const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
          
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
        };

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
      }

      setPushSubscription(subscription);
      
      // Enable notifications in preferences
      const newPreferences = { ...preferences, enabled: true };
      await savePreferences(newPreferences);
      
      logger.debug('[useNotificationPreferences] Notifications enabled successfully');
      return true;
    } catch (err) {
      logger.error('[useNotificationPreferences] Error enabling notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to enable notifications');
      return false;
    }
  }, [preferences, savePreferences]);

  // Disable notifications
  const disableNotifications = useCallback(async (): Promise<boolean> => {
    try {
      // Unsubscribe from push notifications
      if (pushSubscription) {
        await pushSubscription.unsubscribe();
        setPushSubscription(null);
      }

      // Disable notifications in preferences
      const newPreferences = { ...preferences, enabled: false };
      await savePreferences(newPreferences);
      
      logger.debug('[useNotificationPreferences] Notifications disabled successfully');
      return true;
    } catch (err) {
      logger.error('[useNotificationPreferences] Error disabling notifications:', err);
      setError('Failed to disable notifications');
      return false;
    }
  }, [pushSubscription, preferences, savePreferences]);

  // Update specific notification type preference
  const updateNotificationType = useCallback(async (type: keyof NotificationPreferences['types'], enabled: boolean) => {
    try {
      const newPreferences = {
        ...preferences,
        types: {
          ...preferences.types,
          [type]: enabled
        }
      };
      await savePreferences(newPreferences);
    } catch (err) {
      logger.error('[useNotificationPreferences] Error updating notification type:', err);
      throw err;
    }
  }, [preferences, savePreferences]);

  // Load preferences on component mount and user change
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Check push subscription on component mount
  useEffect(() => {
    checkPushSubscription();
  }, [checkPushSubscription]);

  return {
    preferences,
    pushSubscription,
    isLoading,
    error,
    enableNotifications,
    disableNotifications,
    updateNotificationType,
    savePreferences,
    loadPreferences
  };
};