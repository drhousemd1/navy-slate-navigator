import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { NotificationPreferences } from '@/data/notifications/types';

export const useNotificationSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  // Force cache refresh key with timestamp
  const getCacheKey = () => ['notification-preferences', user?.id, Date.now()];

  // Load preferences from database with cache busting
  const loadPreferences = async (bustCache = false) => {
    if (!user?.id) return;
    
    setLoading(true);
    
    // Clear any stale cache if bust cache is requested
    if (bustCache) {
      await queryClient.invalidateQueries({ 
        queryKey: ['notification-preferences', user.id] 
      });
    }
    
    try {
      // Always fetch fresh from database on mobile
      const timestamp = Date.now();
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const freshPrefs = data.preferences as unknown as NotificationPreferences;
        setPreferences(freshPrefs);
        console.log('📱 [Mobile Cache Debug] Loaded fresh preferences:', freshPrefs);
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

  // Save preferences to database with aggressive cache invalidation
  const savePreferences = async (newPreferences: NotificationPreferences) => {
    if (!user?.id) return false;

    try {
      console.log('📱 [Mobile Cache Debug] Saving preferences:', newPreferences);
      
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          preferences: newPreferences as any
        });

      if (error) throw error;

      // Immediately update local state
      setPreferences(newPreferences);
      
      // Aggressively invalidate all notification-related cache
      await queryClient.invalidateQueries({ 
        queryKey: ['notification-preferences'] 
      });
      
      // Force refetch to ensure mobile gets fresh data
      setTimeout(() => {
        loadPreferences(true);
      }, 100);
      
      console.log('📱 [Mobile Cache Debug] Preferences saved and cache invalidated');
      return true;
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      return false;
    }
  };

  // Load preferences when user changes - always bust cache on mobile
  useEffect(() => {
    if (user?.id) {
      // Always load with cache busting on mobile to ensure fresh data
      loadPreferences(true);
    }
  }, [user?.id]);

  return {
    preferences,
    loading,
    savePreferences,
    loadPreferences
  };
};