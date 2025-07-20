import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { notificationQueue, type QueuedNotification } from '@/services/notificationQueue';

export type NotificationType = 'ruleBroken' | 'taskCompleted' | 'rewardPurchased' | 'rewardRedeemed' | 'punishmentPerformed' | 'wellnessUpdated' | 'wellnessCheckin' | 'messages';

interface SendNotificationParams {
  targetUserId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const usePushNotifications = () => {
  const { user } = useAuth();

  const sendNotificationImmediately = async (notification: QueuedNotification): Promise<boolean> => {
    if (!user) {
      logger.error('User not authenticated');
      return false;
    }

    try {
      const { data: result, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          targetUserId: notification.targetUserId,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
        },
      });

      if (error) {
        logger.error('Error sending push notification:', error);
        return false;
      }

      logger.info('Push notification sent successfully:', result);
      return true;
    } catch (error) {
      logger.error('Error invoking push notification function:', error);
      return false;
    }
  };

  const sendNotification = async ({
    targetUserId,
    type,
    title,
    body,
    data = {}
  }: SendNotificationParams): Promise<boolean> => {
    // For backward compatibility - immediate send
    return sendNotificationImmediately({
      targetUserId,
      type,
      title,
      body,
      data,
      timestamp: Date.now()
    });
  };

  const queueNotification = (params: SendNotificationParams): void => {
    const queuedNotification: QueuedNotification = {
      ...params,
      data: params.data || {},
      timestamp: Date.now()
    };

    notificationQueue.queueNotification(queuedNotification, sendNotificationImmediately);
  };

  // Immediate notification methods (critical notifications)
  const sendRuleBrokenNotification = async (targetUserId: string, ruleName: string) => {
    return sendNotification({
      targetUserId,
      type: 'ruleBroken',
      title: 'Rule Broken',
      body: `A rule has been broken: ${ruleName}`,
      data: { type: 'rule_broken', ruleName },
    });
  };

  const sendWellnessCheckinNotification = async (targetUserId: string) => {
    return sendNotification({
      targetUserId,
      type: 'wellnessCheckin',
      title: 'Wellness Check-in Reminder',
      body: 'Time for your daily wellness check-in!',
      data: { type: 'wellness_checkin' },
    });
  };

  // Queued notification methods (batchable notifications)
  const queueTaskCompletedNotification = (targetUserId: string, taskName: string, points: number) => {
    queueNotification({
      targetUserId,
      type: 'taskCompleted',
      title: 'Task Completed',
      body: `Task completed: ${taskName} (+${points} points)`,
      data: { type: 'task_completed', taskName, points },
    });
  };

  const queueRewardPurchasedNotification = (targetUserId: string, rewardName: string, cost: number) => {
    queueNotification({
      targetUserId,
      type: 'rewardPurchased',
      title: 'Reward Purchased',
      body: `Reward purchased: ${rewardName} (-${cost} points)`,
      data: { type: 'reward_purchased', rewardName, cost },
    });
  };

  const queueRewardRedeemedNotification = (targetUserId: string, rewardName: string) => {
    queueNotification({
      targetUserId,
      type: 'rewardRedeemed',
      title: 'Reward Redeemed',
      body: `Reward redeemed: ${rewardName}`,
      data: { type: 'reward_redeemed', rewardName },
    });
  };

  const queuePunishmentPerformedNotification = (targetUserId: string, punishmentName: string, points: number) => {
    queueNotification({
      targetUserId,
      type: 'punishmentPerformed',
      title: 'Punishment Applied',
      body: `Punishment applied: ${punishmentName} (-${points} points)`,
      data: { type: 'punishment_performed', punishmentName, points },
    });
  };

  const queueWellnessUpdatedNotification = (targetUserId: string, overallScore: number) => {
    queueNotification({
      targetUserId,
      type: 'wellnessUpdated',
      title: 'Wellness Updated',
      body: `Wellness score updated: ${overallScore}/100`,
      data: { type: 'wellness_updated', overallScore },
    });
  };

  const queueMessageNotification = (targetUserId: string, senderName: string, messagePreview: string) => {
    queueNotification({
      targetUserId,
      type: 'messages',
      title: `New message from ${senderName}`,
      body: messagePreview,
      data: { type: 'message', senderName },
    });
  };

  // Backward compatibility - legacy immediate methods
  const sendTaskCompletedNotification = async (targetUserId: string, taskName: string, points: number) => {
    return sendNotification({
      targetUserId,
      type: 'taskCompleted',
      title: 'Task Completed',
      body: `Task completed: ${taskName} (+${points} points)`,
      data: { type: 'task_completed', taskName, points },
    });
  };

  const sendRewardPurchasedNotification = async (targetUserId: string, rewardName: string, cost: number) => {
    return sendNotification({
      targetUserId,
      type: 'rewardPurchased',
      title: 'Reward Purchased',
      body: `Reward purchased: ${rewardName} (-${cost} points)`,
      data: { type: 'reward_purchased', rewardName, cost },
    });
  };

  const sendRewardRedeemedNotification = async (targetUserId: string, rewardName: string) => {
    return sendNotification({
      targetUserId,
      type: 'rewardRedeemed',
      title: 'Reward Redeemed',
      body: `Reward redeemed: ${rewardName}`,
      data: { type: 'reward_redeemed', rewardName },
    });
  };

  const sendPunishmentPerformedNotification = async (targetUserId: string, punishmentName: string, points: number) => {
    return sendNotification({
      targetUserId,
      type: 'punishmentPerformed',
      title: 'Punishment Applied',
      body: `Punishment applied: ${punishmentName} (-${points} points)`,
      data: { type: 'punishment_performed', punishmentName, points },
    });
  };

  const sendWellnessUpdatedNotification = async (targetUserId: string, overallScore: number) => {
    return sendNotification({
      targetUserId,
      type: 'wellnessUpdated',
      title: 'Wellness Updated',
      body: `Wellness score updated: ${overallScore}/100`,
      data: { type: 'wellness_updated', overallScore },
    });
  };

  const sendMessageNotification = async (targetUserId: string, senderName: string, messagePreview: string) => {
    return sendNotification({
      targetUserId,
      type: 'messages',
      title: `New message from ${senderName}`,
      body: messagePreview,
      data: { type: 'message', senderName },
    });
  };

  return {
    // Core methods
    sendNotification,
    queueNotification,
    
    // Immediate notification methods (critical)
    sendRuleBrokenNotification,
    sendWellnessCheckinNotification,
    
    // Queued notification methods (batchable)
    queueTaskCompletedNotification,
    queueRewardPurchasedNotification,
    queueRewardRedeemedNotification,
    queuePunishmentPerformedNotification,
    queueWellnessUpdatedNotification,
    queueMessageNotification,
    
    // Backward compatibility (legacy immediate methods)
    sendTaskCompletedNotification,
    sendRewardPurchasedNotification,
    sendRewardRedeemedNotification,
    sendPunishmentPerformedNotification,
    sendWellnessUpdatedNotification,
    sendMessageNotification,
  };
};