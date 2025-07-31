import { useAppVisibility } from './useAppVisibility';
import { usePushNotifications } from './usePushNotifications';
import { useNotificationSettings } from './useNotificationSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { logger } from '@/lib/logger';

export const useSmartMessageNotifications = () => {
  const { isAppActive } = useAppVisibility();
  const { sendMessageNotification } = usePushNotifications();
  const { preferences } = useNotificationSettings();
  const { user } = useAuth();
  const location = useLocation();

  const shouldSendNotification = (receiverId: string): boolean => {
    logger.info('[useSmartMessageNotifications] Checking if should send notification:', {
      receiverId,
      currentUserId: user?.id,
      isAppActive,
      currentPath: location.pathname,
      preferencesEnabled: preferences?.enabled,
      messagesEnabled: preferences?.types?.messages
    });
    
    // Don't send if notifications are disabled
    if (!preferences.enabled || !preferences.types.messages) {
      logger.info('[useSmartMessageNotifications] Not sending - notifications disabled');
      return false;
    }

    // Don't send if this is the receiver (sending to yourself)
    if (user?.id === receiverId) {
      logger.info('[useSmartMessageNotifications] Not sending - message to self');
      return false;
    }

    // Don't send if app is active and user is on messages page
    if (isAppActive && location.pathname === '/messages') {
      logger.info('[useSmartMessageNotifications] Not sending - app active and on messages page');
      return false;
    }

    // Send notification if app is not active or user is not on messages page
    logger.info('[useSmartMessageNotifications] Should send notification: true');
    return true;
  };

  const sendNewMessageNotification = async (
    receiverId: string,
    senderName: string,
    messageContent: string
  ): Promise<boolean> => {
    logger.info('[useSmartMessageNotifications] sendNewMessageNotification called:', {
      receiverId,
      senderName,
      messageLength: messageContent.length
    });
    
    if (!shouldSendNotification(receiverId)) {
      logger.info('[useSmartMessageNotifications] Not sending notification - conditions not met');
      return false;
    }

    // Create a preview of the message (first 50 characters)
    const messagePreview = messageContent.length > 50 
      ? `${messageContent.substring(0, 50)}...`
      : messageContent;

    logger.info('[useSmartMessageNotifications] Sending message notification');
    const result = await sendMessageNotification(receiverId, senderName, messagePreview || '📱 New message');
    logger.info('[useSmartMessageNotifications] Message notification result:', result);
    return result;
  };

  return {
    sendNewMessageNotification,
    shouldSendNotification,
  };
};