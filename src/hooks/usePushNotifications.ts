import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

export type NotificationType = 'ruleBroken' | 'taskCompleted' | 'rewardPurchased' | 'rewardRedeemed' | 'punishmentPerformed' | 'wellnessUpdated' | 'wellnessCheckin';

interface SendNotificationParams {
  targetUserId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const usePushNotifications = () => {
  const { user } = useAuth();

  const sendNotification = async ({
    targetUserId,
    type,
    title,
    body,
    data = {}
  }: SendNotificationParams): Promise<boolean> => {
    if (!user) {
      logger.error('User not authenticated');
      return false;
    }

    try {
      const { data: result, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          targetUserId,
          type,
          title,
          body,
          data,
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

  const sendRuleBrokenNotification = async (targetUserId: string, ruleName: string) => {
    return sendNotification({
      targetUserId,
      type: 'ruleBroken',
      title: 'Rule Broken',
      body: `A rule has been broken: ${ruleName}`,
      data: { type: 'rule_broken', ruleName },
    });
  };

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

  const sendWellnessCheckinNotification = async (targetUserId: string) => {
    return sendNotification({
      targetUserId,
      type: 'wellnessCheckin',
      title: 'Wellness Check-in Reminder',
      body: 'Time for your daily wellness check-in!',
      data: { type: 'wellness_checkin' },
    });
  };

  return {
    sendNotification,
    sendRuleBrokenNotification,
    sendTaskCompletedNotification,
    sendRewardPurchasedNotification,
    sendRewardRedeemedNotification,
    sendPunishmentPerformedNotification,
    sendWellnessUpdatedNotification,
    sendWellnessCheckinNotification,
  };
};