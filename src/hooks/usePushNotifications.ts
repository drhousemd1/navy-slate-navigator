import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { logger } from '@/lib/logger';

export type NotificationType = 
  | 'ruleBroken'
  | 'taskCompleted'
  | 'rewardPurchased'
  | 'rewardRedeemed'
  | 'punishmentPerformed'
  | 'wellnessUpdated';

interface NotificationPayload {
  title: string;
  body: string;
  type: NotificationType;
  url?: string;
  payload?: Record<string, any>;
  requireInteraction?: boolean;
}

export const usePushNotifications = () => {
  const { user } = useAuth();

  const sendNotificationToPartner = useCallback(async (
    partnerId: string,
    notification: NotificationPayload
  ): Promise<boolean> => {
    try {
      if (!user) {
        logger.warn('[usePushNotifications] User not authenticated');
        return false;
      }

      // Call the send-push-notification edge function
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          ...notification,
          targetUserId: partnerId // Send to partner, not current user
        }
      });

      if (error) {
        logger.error('[usePushNotifications] Error sending push notification:', error);
        return false;
      }

      logger.debug('[usePushNotifications] Push notification sent successfully', {
        type: notification.type,
        targetUserId: partnerId
      });
      return true;
    } catch (error) {
      logger.error('[usePushNotifications] Failed to send push notification:', error);
      return false;
    }
  }, [user]);

  const notifyRuleBroken = useCallback(async (partnerId: string, ruleName: string) => {
    return sendNotificationToPartner(partnerId, {
      title: 'Rule Broken',
      body: `${ruleName} rule has been marked as broken`,
      type: 'ruleBroken',
      url: '/rules'
    });
  }, [sendNotificationToPartner]);

  const notifyTaskCompleted = useCallback(async (partnerId: string, taskName: string) => {
    return sendNotificationToPartner(partnerId, {
      title: 'Task Completed',
      body: `${taskName} has been completed`,
      type: 'taskCompleted',
      url: '/tasks'
    });
  }, [sendNotificationToPartner]);

  const notifyRewardPurchased = useCallback(async (partnerId: string, rewardName: string) => {
    return sendNotificationToPartner(partnerId, {
      title: 'Reward Purchased',
      body: `${rewardName} has been purchased`,
      type: 'rewardPurchased',
      url: '/rewards'
    });
  }, [sendNotificationToPartner]);

  const notifyRewardRedeemed = useCallback(async (partnerId: string, rewardName: string) => {
    return sendNotificationToPartner(partnerId, {
      title: 'Reward Redeemed',
      body: `${rewardName} has been redeemed`,
      type: 'rewardRedeemed',
      url: '/rewards'
    });
  }, [sendNotificationToPartner]);

  const notifyPunishmentPerformed = useCallback(async (partnerId: string, punishmentName: string) => {
    return sendNotificationToPartner(partnerId, {
      title: 'Punishment Performed',
      body: `${punishmentName} punishment has been applied`,
      type: 'punishmentPerformed',
      url: '/punishments'
    });
  }, [sendNotificationToPartner]);

  const notifyWellnessUpdated = useCallback(async (partnerId: string, score: number) => {
    return sendNotificationToPartner(partnerId, {
      title: 'Wellness Score Updated',
      body: `Your partner's wellness score has been updated to ${score}`,
      type: 'wellnessUpdated',
      url: '/wellbeing'
    });
  }, [sendNotificationToPartner]);

  return {
    sendNotificationToPartner,
    notifyRuleBroken,
    notifyTaskCompleted,
    notifyRewardPurchased,
    notifyRewardRedeemed,
    notifyPunishmentPerformed,
    notifyWellnessUpdated
  };
};