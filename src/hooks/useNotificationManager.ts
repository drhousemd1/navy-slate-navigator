import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateNotificationPreferences, useCreatePushSubscription, useDeletePushSubscription } from '@/data/notifications';
import type { NotificationPreferences } from '@/data/notifications/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Simple VAPID key for development
const VAPID_PUBLIC_KEY = "BEl62iUYgUivxIkv69yViEuiBIa40HEd0-3NqShQqFng_blTsrfCNnHR-f1z6J1KuEf8bjuMc2g6F8C9_1mNsNE";

// Mobile detection utility
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// iOS detection utility  
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

// Check if we're in a secure context (HTTPS)
const isSecureContext = () => {
  return window.location.protocol === 'https:' || window.location.hostname === 'localhost';
};

export function useNotificationManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const updatePreferences = useUpdateNotificationPreferences();
  const createPushSubscription = useCreatePushSubscription();
  const deletePushSubscription = useDeletePushSubscription();
  
  const [pushSupported, setPushSupported] = useState<boolean | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  // Check push notification support on mount
  useEffect(() => {
    const checkPushSupport = () => {
      try {
        // Basic feature detection
        if (!('serviceWorker' in navigator)) {
          setPushError('Service Workers not supported');
          setPushSupported(false);
          return;
        }

        if (!('PushManager' in window)) {
          setPushError('Push messaging not supported');
          setPushSupported(false);
          return;
        }

        if (!('Notification' in window)) {
          setPushError('Notifications not supported');
          setPushSupported(false);
          return;
        }

        // Check for secure context
        if (!isSecureContext()) {
          setPushError('Secure context (HTTPS) required for push notifications');
          setPushSupported(false);
          return;
        }

        // Special handling for iOS
        if (isIOS()) {
          // iOS 16.4+ supports push notifications in web apps when added to home screen
          const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
          if (!isStandalone) {
            setPushError('On iOS, add this app to your home screen to enable push notifications');
            setPushSupported(false);
            return;
          }
        }

        console.log('Push notifications are supported');
        setPushSupported(true);
        setPushError(null);
      } catch (error) {
        console.error('Error checking push support:', error);
        setPushError('Error checking notification support');
        setPushSupported(false);
      }
    };

    checkPushSupport();
  }, []);

  // Helper to get current preferences from query cache
  const getCurrentPreferences = useCallback((): NotificationPreferences | undefined => {
    return queryClient.getQueryData<NotificationPreferences>(['notification-preferences', user?.id]);
  }, [queryClient, user?.id]);

  const enablePushNotifications = useCallback(async (): Promise<boolean> => {
    try {
      // Check if push notifications are supported
      if (!pushSupported) {
        console.warn('Push notifications not supported:', pushError);
        if (isMobile()) {
          toast({
            title: 'Push Notifications Not Available',
            description: pushError || 'Push notifications are not supported on this device',
            variant: 'destructive'
          });
        }
        return false;
      }

      // Request permission with user gesture (required on mobile)
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      
      if (permission !== 'granted') {
        const message = permission === 'denied' 
          ? 'Push notifications have been blocked. Please enable them in your browser settings.'
          : 'Push notification permission was not granted.';
        
        console.warn('Notification permission not granted:', permission);
        toast({
          title: 'Permission Required',
          description: message,
          variant: 'destructive'
        });
        return false;
      }

      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push notifications
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
      } else {
        throw new Error('Invalid subscription data received');
      }

      console.log('Push subscription created and stored successfully');
      if (isMobile()) {
        toast({
          title: 'Push Notifications Enabled',
          description: 'You will now receive push notifications'
        });
      }
      return true;
    } catch (error) {
      console.error('Failed to enable push notifications:', error);
      
      let errorMessage = 'Failed to enable push notifications';
      if (error instanceof Error) {
        if (error.name === 'NotSupportedError') {
          errorMessage = 'Push notifications are not supported on this device';
        } else if (error.name === 'NotAllowedError') {
          errorMessage = 'Push notifications have been blocked. Please enable them in your browser settings.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error while setting up notifications. Please check your connection.';
        }
      }
      
      toast({
        title: 'Setup Failed',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    }
  }, [pushSupported, pushError, createPushSubscription]);

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
      toast({
        title: 'Error',
        description: 'Unable to load notification preferences. Please try again.',
        variant: 'destructive'
      });
      return;
    }

    console.log('Enabling notifications with current preferences:', currentPreferences);

    // Always update preferences to enabled, regardless of push notification support
    const newPreferences: NotificationPreferences = {
      ...currentPreferences,
      enabled: true,
    };

    try {
      // Try to enable push notifications, but don't fail if it doesn't work
      const pushSuccess = await enablePushNotifications();
      
      // Always update preferences in database (progressive enhancement)
      updatePreferences.mutate({ preferences: newPreferences });
      
      if (!pushSuccess && pushSupported) {
        console.warn('Push notification setup failed, but preferences saved');
        toast({
          title: 'Partial Success',
          description: 'Notification preferences saved, but push notifications could not be enabled.',
          variant: 'default'
        });
      } else if (!pushSupported) {
        console.log('Push notifications not supported, but preferences saved');
        toast({
          title: 'Preferences Saved',
          description: 'Notification preferences saved. Push notifications are not available on this device.',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      // Still try to save preferences even if push setup fails
      updatePreferences.mutate({ preferences: newPreferences });
      toast({
        title: 'Preferences Saved',
        description: 'Notification preferences saved, but push notifications could not be enabled.',
        variant: 'default'
      });
    }
  }, [getCurrentPreferences, updatePreferences, enablePushNotifications, pushSupported]);

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
    pushSupported,
    pushError,
    isMobile: isMobile(),
    isIOS: isIOS(),
  };
}