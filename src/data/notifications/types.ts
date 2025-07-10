export interface NotificationPreferences {
  enabled: boolean;
  types: {
    ruleBroken: boolean;
    taskCompleted: boolean;
    rewardPurchased: boolean;
    rewardRedeemed: boolean;
    punishmentPerformed: boolean;
    wellnessUpdated: boolean;
  };
}

export interface UserNotificationPreferences {
  id: string;
  user_id: string;
  preferences: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: false,
  types: {
    ruleBroken: true,
    taskCompleted: true,
    rewardPurchased: true,
    rewardRedeemed: true,
    punishmentPerformed: true,
    wellnessUpdated: true,
  },
};