import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { useNotificationSettings } from './useNotificationSettings';

export type NotificationType = 'ruleBroken' | 'taskCompleted' | 'rewardPurchased' | 'rewardRedeemed' | 'punishmentPerformed' | 'wellnessUpdated' | 'wellnessCheckin' | 'messages' | 'test';

interface SendNotificationParams {
  targetUserId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const { preferences, isLoading: preferencesLoading } = useNotificationSettings();

  const sendNotification = async ({
    targetUserId,
    type,
    title,
    body,
    data = {}
  }: SendNotificationParams): Promise<boolean> => {
    logger.info('[usePushNotifications] sendNotification called:', { 
      targetUserId, 
      type, 
      title, 
      body,
      sendingUserId: user?.id
    });
    
    if (!user) {
      logger.error('[usePushNotifications] User not authenticated');
      return false;
    }

    // Edge function will check the TARGET user's preferences on the server side
    logger.info('[usePushNotifications] Sender authenticated, proceeding to edge function');

    try {
      const requestPayload = {
        targetUserId,
        type,
        title,
        body,
        data,
      };
      
      logger.info('[usePushNotifications] Calling edge function with payload:', requestPayload);
      
      const { data: result, error } = await supabase.functions.invoke('send-push-notification', {
        body: requestPayload,
      });

      if (error) {
        logger.error('[usePushNotifications] Edge function returned error:', error);
        return false;
      }

      logger.info('[usePushNotifications] Edge function call successful, result:', result);
      return true;
    } catch (error) {
      logger.error('[usePushNotifications] Exception calling edge function:', error);
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
    sendNotification,
    sendRuleBrokenNotification,
    sendTaskCompletedNotification,
    sendRewardPurchasedNotification,
    sendRewardRedeemedNotification,
    sendPunishmentPerformedNotification,
    sendWellnessUpdatedNotification,
    sendWellnessCheckinNotification,
    sendMessageNotification,
  };
};