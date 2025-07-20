import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import type { QueuedNotification } from './notificationQueue';

export type Platform = 'web' | 'native';

interface PushNotificationManager {
  platform: Platform;
  initialize: () => Promise<void>;
  sendNotification: (notification: QueuedNotification) => Promise<boolean>;
  requestPermissions: () => Promise<boolean>;
}

class WebPushManager implements PushNotificationManager {
  platform: Platform = 'web';

  async initialize(): Promise<void> {
    logger.info('Initializing web push notifications');
  }

  async sendNotification(notification: QueuedNotification): Promise<boolean> {
    try {
      const { data: result, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          targetUserId: notification.targetUserId,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          platform: 'web'
        },
      });

      if (error) {
        logger.error('Error sending web push notification:', error);
        return false;
      }

      logger.info('Web push notification sent successfully:', result);
      return true;
    } catch (error) {
      logger.error('Error invoking web push notification function:', error);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return false;
    } catch (error) {
      logger.error('Error requesting web notification permissions:', error);
      return false;
    }
  }
}

class NativePushManager implements PushNotificationManager {
  platform: Platform = 'native';

  async initialize(): Promise<void> {
    logger.info('Initializing native push notifications');
    
    try {
      // Register for push notifications
      await PushNotifications.register();

      // Handle registration token
      PushNotifications.addListener('registration', (token) => {
        logger.info('Push registration success, token:', token.value);
        // Store token for sending to backend
        this.storeRegistrationToken(token.value);
      });

      // Handle registration error
      PushNotifications.addListener('registrationError', (error) => {
        logger.error('Error on registration:', error);
      });

      // Handle push notification received
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        logger.info('Push notification received:', notification);
      });

      // Handle push notification action performed
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        logger.info('Push notification action performed:', notification);
      });

    } catch (error) {
      logger.error('Error initializing native push notifications:', error);
    }
  }

  private async storeRegistrationToken(token: string): Promise<void> {
    try {
      // Store the token in the user's profile or a dedicated table
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token } as any)
        .eq('id', (await supabase.auth.getUser()).data.user?.id);

      if (error) {
        logger.error('Error storing push token:', error);
      } else {
        logger.info('Push token stored successfully');
      }
    } catch (error) {
      logger.error('Error storing push token:', error);
    }
  }

  async sendNotification(notification: QueuedNotification): Promise<boolean> {
    try {
      const { data: result, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          targetUserId: notification.targetUserId,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          platform: 'native'
        },
      });

      if (error) {
        logger.error('Error sending native push notification:', error);
        return false;
      }

      logger.info('Native push notification sent successfully:', result);
      return true;
    } catch (error) {
      logger.error('Error invoking native push notification function:', error);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const result = await PushNotifications.requestPermissions();
      return result.receive === 'granted';
    } catch (error) {
      logger.error('Error requesting native notification permissions:', error);
      return false;
    }
  }
}

// Factory function to create the appropriate push manager
export function createPushNotificationManager(): PushNotificationManager {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    logger.info('Creating native push notification manager');
    return new NativePushManager();
  } else {
    logger.info('Creating web push notification manager');
    return new WebPushManager();
  }
}

// Singleton instance
let pushManager: PushNotificationManager | null = null;

export function getPushNotificationManager(): PushNotificationManager {
  if (!pushManager) {
    pushManager = createPushNotificationManager();
  }
  return pushManager;
}