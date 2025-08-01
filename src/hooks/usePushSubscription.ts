
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

export const usePushSubscription = () => {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchVapidPublicKey();
    }
  }, [user]);

  useEffect(() => {
    if (vapidPublicKey && user) {
      checkPushSupport();
      checkSubscriptionStatus();
    }
  }, [vapidPublicKey, user]);

  // Fetch VAPID public key from server
  const fetchVapidPublicKey = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-vapid-public-key');
      
      if (error) {
        console.error('Failed to fetch VAPID public key:', error);
        setIsLoading(false);
        return;
      }

      if (data?.publicKey) {
        setVapidPublicKey(data.publicKey);
      } else {
        console.error('No public key received from server');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching VAPID public key:', error);
      setIsLoading(false);
    }
  };

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
      logger.info('[usePushSubscription] Skipping subscription check - not supported or no user');
      setIsLoading(false);
      return;
    }

    try {
      logger.info('[usePushSubscription] Checking subscription status for user:', user.id);
      const registration = await navigator.serviceWorker.ready;
      logger.info('[usePushSubscription] Got service worker registration for subscription check');
      
      const subscription = await registration.pushManager.getSubscription();
      logger.info('[usePushSubscription] Current browser subscription:', subscription ? 'exists' : 'none');
      
      if (subscription) {
        logger.info('[usePushSubscription] Checking database for subscriptions for user:', user.id);
        
        // CRITICAL FIX: Check for ANY valid subscription for this user, not just the current endpoint
        // This fixes the multiple subscriptions issue where .maybeSingle() would fail
        const { data: subscriptions, error } = await supabase
          .from('user_push_subscriptions')
          .select('id, endpoint')
          .eq('user_id', user.id);

        if (error) {
          logger.error('[usePushSubscription] Database query error:', error);
          setIsSubscribed(false);
        } else {
          const hasValidSubscriptions = subscriptions && subscriptions.length > 0;
          const currentEndpointExists = subscriptions?.some(sub => sub.endpoint === subscription.endpoint);
          
          logger.info('[usePushSubscription] Database subscription check:', {
            totalSubscriptions: subscriptions?.length || 0,
            currentEndpointExists,
            hasValidSubscriptions,
            userSubscriptions: subscriptions?.map(s => ({ id: s.id, endpoint: s.endpoint.substring(0, 50) + '...' }))
          });
          
          // User is considered subscribed if they have ANY valid subscription in the database
          setIsSubscribed(hasValidSubscriptions);
          
          // If current browser subscription doesn't exist in DB but user has others, add it
          if (hasValidSubscriptions && !currentEndpointExists) {
            logger.info('[usePushSubscription] Current browser subscription not in DB, adding it');
            await addCurrentSubscriptionToDB(subscription);
          }
        }
      } else {
        logger.info('[usePushSubscription] No browser subscription found');
        // Still check if user has subscriptions in DB from other devices/browsers
        const { data: subscriptions, error } = await supabase
          .from('user_push_subscriptions')
          .select('id')
          .eq('user_id', user.id);
          
        if (!error && subscriptions && subscriptions.length > 0) {
          logger.info('[usePushSubscription] User has subscriptions from other devices:', subscriptions.length);
          setIsSubscribed(true);
        } else {
          setIsSubscribed(false);
        }
      }
    } catch (error) {
      logger.error('[usePushSubscription] Error checking subscription status:', error);
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to add current browser subscription to database
  const addCurrentSubscriptionToDB = async (subscription: PushSubscription) => {
    try {
      if (!user || !vapidPublicKey) return;
      
      const p256dh = arrayBufferToBase64(subscription.getKey('p256dh')!);
      const auth = arrayBufferToBase64(subscription.getKey('auth')!);

      // Delete existing subscriptions first to maintain only one subscription per user
      await supabase
        .from('user_push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      // Insert the current subscription
      const { error } = await supabase
        .from('user_push_subscriptions')
        .insert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent,
        });

      if (error) {
        logger.error('[usePushSubscription] Error adding current subscription to DB:', error);
      } else {
        logger.info('[usePushSubscription] Successfully added current subscription to DB');
      }
    } catch (error) {
      logger.error('[usePushSubscription] Exception adding current subscription to DB:', error);
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
      logger.info('Permission already granted, proceeding with subscription');
      return true;
    }

    // If denied, don't try to request again
    if (currentPermission === 'denied') {
      logger.warn('Permission previously denied - user needs to enable in browser settings');
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

      if (!vapidPublicKey) {
        logger.error('VAPID public key not available');
        return false;
      }

      // Subscribe to push notifications with VAPID public key
      logger.info('Attempting to subscribe to push manager...');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      logger.info('Push subscription created successfully');

      // Convert subscription to format for database
      const p256dh = arrayBufferToBase64(subscription.getKey('p256dh')!);
      const auth = arrayBufferToBase64(subscription.getKey('auth')!);

      // Delete any existing subscriptions for this user to ensure only one active subscription
      logger.info('Removing any existing subscriptions for user before adding new one');
      await supabase
        .from('user_push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      // Insert the new subscription
      const { error } = await supabase
        .from('user_push_subscriptions')
        .insert({
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
      }

      // Remove ALL subscriptions for this user from database to ensure clean state
      const { error } = await supabase
        .from('user_push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        logger.error('Error removing push subscriptions:', error);
        return false;
      }

      setIsSubscribed(false);
      logger.info('Successfully unsubscribed from push notifications and removed all subscriptions');
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
