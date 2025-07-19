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
    // Don't send if notifications are disabled
    if (!preferences.enabled || !preferences.types.messages) {
      logger.debug('[SmartMessageNotifications] Notifications disabled for messages');
      return false;
    }

    // Don't send if this is the receiver (sending to yourself)
    if (user?.id === receiverId) {
      logger.debug('[SmartMessageNotifications] Not sending notification - message to self');
      return false;
    }

    // Don't send if app is active and user is on messages page
    if (isAppActive && location.pathname === '/messages') {
      logger.debug('[SmartMessageNotifications] App is active and on messages page - not sending notification');
      return false;
    }

    // Send notification if app is not active or user is not on messages page
    logger.debug('[SmartMessageNotifications] App conditions met - will send notification');
    return true;
  };

  const sendNewMessageNotification = async (
    receiverId: string,
    senderName: string,
    messageContent: string
  ): Promise<boolean> => {
    if (!shouldSendNotification(receiverId)) {
      return false;
    }

    // Create a preview of the message (first 50 characters)
    const messagePreview = messageContent.length > 50 
      ? `${messageContent.substring(0, 50)}...`
      : messageContent;

    logger.info(`[SmartMessageNotifications] Sending message notification to ${receiverId}`);
    
    return await sendMessageNotification(receiverId, senderName, messagePreview || '📱 New message');
  };

  return {
    sendNewMessageNotification,
    shouldSendNotification,
  };
};