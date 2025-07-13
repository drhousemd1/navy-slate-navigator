import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { NotificationPreferences } from '@/data/notifications/types';

export const useNotificationSettings = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  // Clear all notification cache on app start
  const clearNotificationCache = () => {
    try {
      // Clear any potential IndexedDB notification data
      if (typeof window !== 'undefined' && window.localStorage) {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.includes('notification') || key.includes('Notification')) {
            localStorage.removeItem(key);
          }
        });
      }
      console.log('🧹 [Cache Clear] Cleared all notification cache');
    } catch (error) {
      console.log('Cache clear error (non-critical):', error);
    }
  };

  // Load preferences DIRECTLY from database - NO CACHE
  const loadPreferences = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    clearNotificationCache(); // Clear cache every time
    
    try {
      console.log('📱 [Direct DB] Loading notification preferences directly from Supabase...');
      
      // Direct Supabase call - no caching layers
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const freshPrefs = data.preferences as unknown as NotificationPreferences;
        setPreferences(freshPrefs);
        console.log('✅ [Direct DB] Loaded fresh preferences:', freshPrefs);
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
          console.log('✅ [Direct DB] Created default preferences:', defaultPrefs);
        }
      }
    } catch (error) {
      console.error('❌ [Direct DB] Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save preferences DIRECTLY to database - NO CACHE
  const savePreferences = async (newPreferences: NotificationPreferences) => {
    if (!user?.id) return false;

    try {
      console.log('💾 [Direct DB] Saving preferences to Supabase:', newPreferences);
      
      // Direct Supabase call - no caching layers
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          preferences: newPreferences as any
        });

      if (error) throw error;

      // Update local state immediately
      setPreferences(newPreferences);
      
      // Clear any residual cache
      clearNotificationCache();
      
      console.log('✅ [Direct DB] Preferences saved successfully');
      return true;
    } catch (error) {
      console.error('❌ [Direct DB] Error saving notification preferences:', error);
      return false;
    }
  };

  // Load preferences when user changes - clear cache first
  useEffect(() => {
    if (user?.id) {
      console.log('👤 [User Change] Loading notification preferences for user:', user.id);
      clearNotificationCache();
      loadPreferences();
    }
  }, [user?.id]);

  return {
    preferences,
    loading,
    savePreferences,
    loadPreferences
  };
};