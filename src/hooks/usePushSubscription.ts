
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

export const usePushSubscription = () => {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializePushNotifications = async () => {
      await checkPushSupport();
      if (user) {
        await checkSubscriptionStatus();
      }
    };
    
    initializePushNotifications();
  }, [user]);

  const checkPushSupport = async () => {
    logger.info('Checking push notification support...');
    
    // Basic API check
    const hasApis = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    logger.info('Basic APIs available:', hasApis);
    
    if (!hasApis) {
      logger.warn('Missing required APIs for push notifications');
      setIsSupported(false);
      setIsLoading(false);
      return;
    }

    try {
      // Try to get service worker registration
      logger.info('Waiting for service worker registration...');
      const registration = await navigator.serviceWorker.ready;
      logger.info('Service worker ready:', registration);
      
      // Check if push manager is available
      if (!registration.pushManager) {
        logger.warn('Push manager not available');
        setIsSupported(false);
        setIsLoading(false);
        return;
      }
      
      logger.info('Push notifications fully supported');
      setIsSupported(true);
    } catch (error) {
      logger.error('Service worker registration failed:', error);
      setIsSupported(false);
      setIsLoading(false);
    }
  };

  const checkSubscriptionStatus = async () => {
    if (!isSupported || !user) {
      logger.info('Skipping subscription check - not supported or no user');
      setIsLoading(false);
      return;
    }

    try {
      logger.info('Checking subscription status...');
      const registration = await navigator.serviceWorker.ready;
      logger.info('Got service worker registration for subscription check');
      
      const subscription = await registration.pushManager.getSubscription();
      logger.info('Current subscription:', subscription ? 'exists' : 'none');
      
      if (subscription) {
        // Check if subscription exists in database
        const { data, error } = await supabase
          .from('user_push_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint)
          .maybeSingle();

        if (error) {
          logger.error('Database query error:', error);
          setIsSubscribed(false);
        } else {
          setIsSubscribed(!!data);
          logger.info('Subscription status from DB:', !!data);
        }
      } else {
        setIsSubscribed(false);
      }
    } catch (error) {
      logger.error('Error checking subscription status:', error);
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      logger.warn('This browser does not support notifications');
      return false;
    }

    // Log current permission state
    const currentPermission = Notification.permission;
    logger.info('Current notification permission:', currentPermission);

    // If already granted, no need to request again
    if (currentPermission === 'granted') {
      logger.info('Permission already granted');
      return true;
    }

    // If denied, don't try to request again
    if (currentPermission === 'denied') {
      logger.warn('Permission previously denied');
      return false;
    }

    // Request permission (only when 'default')
    logger.info('Requesting notification permission...');
    const permission = await Notification.requestPermission();
    logger.info('Permission request result:', permission);
    return permission === 'granted';
  };

  const subscribe = async (hasUserPermission: boolean = false): Promise<boolean> => {
    if (!isSupported || !user) {
      logger.error('Push notifications not supported or user not authenticated');
      return false;
    }

    try {
      setIsLoading(true);

      // If permission wasn't already requested in user gesture context, request it now
      let hasPermission = hasUserPermission;
      if (!hasPermission) {
        hasPermission = await requestNotificationPermission();
        if (!hasPermission) {
          logger.warn('Notification permission denied');
          return false;
        }
      }

      // Wait for service worker to be ready with timeout
      logger.info('Waiting for service worker to be ready...');
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Service worker timeout')), 10000)
        )
      ]);
      logger.info('Service worker ready for subscription');

      // Subscribe to push notifications with VAPID public key
      logger.info('Attempting to subscribe to push manager...');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          'BCRZq1g3uH8yvR-54dWzDIwq5jC-zRFnrrsGd2urb4QSgmwE6EkURTD7N4AoTRkdGAAvtqsfGP80vL2JRO8alMc'
        ),
      });
      logger.info('Push subscription created successfully');

      // Convert subscription to format for database
      const p256dh = arrayBufferToBase64(subscription.getKey('p256dh')!);
      const auth = arrayBufferToBase64(subscription.getKey('auth')!);

      // Save subscription to database
      const { error } = await supabase
        .from('user_push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent,
        });

      if (error) {
        logger.error('Error saving push subscription:', error);
        return false;
      }

      setIsSubscribed(true);
      logger.info('Successfully subscribed to push notifications');
      return true;

    } catch (error) {
      logger.error('Error subscribing to push notifications:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    if (!isSupported || !user) {
      return false;
    }

    try {
      setIsLoading(true);

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Remove from database
        const { error } = await supabase
          .from('user_push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);

        if (error) {
          logger.error('Error removing push subscription:', error);
          return false;
        }
      }

      setIsSubscribed(false);
      logger.info('Successfully unsubscribed from push notifications');
      return true;

    } catch (error) {
      logger.error('Error unsubscribing from push notifications:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // New function to request permission immediately on user gesture
  const requestPermissionImmediately = async (): Promise<boolean> => {
    logger.info('Requesting permission immediately on user gesture');
    return await requestNotificationPermission();
  };

  return {
    isSubscribed,
    isSupported,
    isLoading,
    subscribe,
    unsubscribe,
    checkSubscriptionStatus,
    requestPermissionImmediately,
  };
};

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
