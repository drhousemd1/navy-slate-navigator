import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

export interface NotificationPreferences {
  enabled: boolean;
  types: {
    ruleBroken: boolean;
    taskCompleted: boolean;
    rewardPurchased: boolean;
    rewardRedeemed: boolean;
    punishmentPerformed: boolean;
    wellnessUpdated: boolean;
    wellnessCheckin: boolean;
  };
}

const defaultPreferences: NotificationPreferences = {
  enabled: false,
  types: {
    ruleBroken: true,
    taskCompleted: true,
    rewardPurchased: true,
    rewardRedeemed: true,
    punishmentPerformed: true,
    wellnessUpdated: true,
    wellnessCheckin: true,
  },
};

export const useNotificationSettings = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        logger.error('Error loading notification preferences:', error);
        setPreferences(defaultPreferences);
        return;
      }

      if (data?.preferences) {
        setPreferences(data.preferences as unknown as NotificationPreferences);
      } else {
        // Set default preferences in state only, save will happen on first update
        setPreferences(defaultPreferences);
      }
    } catch (error) {
      logger.error('Error loading notification preferences:', error);
      setPreferences(defaultPreferences);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async (newPreferences: NotificationPreferences) => {
    if (!user) return;

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          preferences: newPreferences as any,
        });

      if (error) {
        logger.error('Error saving notification preferences:', error);
        throw error;
      }

      setPreferences(newPreferences);
      logger.info('Notification preferences saved successfully');
    } catch (error) {
      logger.error('Error saving notification preferences:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    await savePreferences(newPreferences);
  };

  const updateNotificationType = async (type: keyof NotificationPreferences['types'], enabled: boolean) => {
    const newPreferences = {
      ...preferences,
      types: {
        ...preferences.types,
        [type]: enabled,
      },
    };
    await savePreferences(newPreferences);
  };

  const toggleNotifications = async (enabled: boolean) => {
    await updatePreferences({ enabled });
  };

  return {
    preferences,
    isLoading,
    isSaving,
    updatePreferences,
    updateNotificationType,
    toggleNotifications,
    loadPreferences,
  };
};