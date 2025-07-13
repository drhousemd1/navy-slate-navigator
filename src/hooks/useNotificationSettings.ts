import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { NotificationPreferences } from '@/data/notifications/types';

export const useNotificationSettings = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  // Load preferences from database
  const loadPreferences = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences(data.preferences as unknown as NotificationPreferences);
      } else {
        // Create default preferences
        const defaultPrefs: NotificationPreferences = {
          enabled: false,
          types: {
            ruleBroken: true,
            taskCompleted: true,
            rewardPurchased: true,
            rewardRedeemed: true,
            punishmentPerformed: true,
            wellnessUpdated: true,
          }
        };
        
        const { error: insertError } = await supabase
          .from('user_notification_preferences')
          .insert({
            user_id: user.id,
            preferences: defaultPrefs as any
          });

        if (!insertError) {
          setPreferences(defaultPrefs);
        }
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save preferences to database
  const savePreferences = async (newPreferences: NotificationPreferences) => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          preferences: newPreferences as any
        });

      if (error) throw error;

      setPreferences(newPreferences);
      return true;
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      return false;
    }
  };

  // Load preferences when user changes
  useEffect(() => {
    loadPreferences();
  }, [user?.id]);

  return {
    preferences,
    loading,
    savePreferences,
    loadPreferences
  };
};