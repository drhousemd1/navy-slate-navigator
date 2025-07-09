import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { logger } from '@/lib/logger';

export interface WellnessReminder {
  id: string;
  user_id: string;
  enabled: boolean;
  reminder_time: string; // Format: "HH:MM:SS"
  timezone: string;
  last_sent: string | null;
  created_at: string;
  updated_at: string;
}

export const useWellnessReminders = () => {
  const { user } = useAuth();
  const [reminder, setReminder] = useState<WellnessReminder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get user's timezone
  const getUserTimezone = () => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  // Load wellness reminders
  const loadReminder = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('wellness_reminders')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        logger.error('[useWellnessReminders] Error loading reminder:', error);
        setError('Failed to load wellness reminder settings');
        return;
      }

      setReminder(data);
      setError(null);
    } catch (err) {
      logger.error('[useWellnessReminders] Unexpected error:', err);
      setError('Failed to load wellness reminder settings');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Create or update reminder
  const saveReminder = useCallback(async (
    enabled: boolean, 
    reminderTime: string // Format: "HH:MM"
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const timezone = getUserTimezone();
      const timeWithSeconds = `${reminderTime}:00`; // Add seconds

      const reminderData = {
        user_id: user.id,
        enabled,
        reminder_time: timeWithSeconds,
        timezone
      };

      if (reminder) {
        // Update existing reminder
        const { error } = await supabase
          .from('wellness_reminders')
          .update(reminderData)
          .eq('id', reminder.id);

        if (error) {
          logger.error('[useWellnessReminders] Error updating reminder:', error);
          setError('Failed to update wellness reminder');
          return false;
        }
      } else {
        // Create new reminder
        const { data, error } = await supabase
          .from('wellness_reminders')
          .insert([reminderData])
          .select()
          .single();

        if (error) {
          logger.error('[useWellnessReminders] Error creating reminder:', error);
          setError('Failed to create wellness reminder');
          return false;
        }

        setReminder(data);
      }

      // Reload to get updated data
      await loadReminder();
      setError(null);
      logger.debug('[useWellnessReminders] Reminder saved successfully');
      return true;
    } catch (err) {
      logger.error('[useWellnessReminders] Unexpected error saving reminder:', err);
      setError('Failed to save wellness reminder');
      return false;
    }
  }, [user?.id, reminder, loadReminder]);

  // Delete reminder
  const deleteReminder = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !reminder) return false;

    try {
      const { error } = await supabase
        .from('wellness_reminders')
        .delete()
        .eq('id', reminder.id);

      if (error) {
        logger.error('[useWellnessReminders] Error deleting reminder:', error);
        setError('Failed to delete wellness reminder');
        return false;
      }

      setReminder(null);
      setError(null);
      logger.debug('[useWellnessReminders] Reminder deleted successfully');
      return true;
    } catch (err) {
      logger.error('[useWellnessReminders] Unexpected error deleting reminder:', err);
      setError('Failed to delete wellness reminder');
      return false;
    }
  }, [user?.id, reminder]);

  // Format time for display (HH:MM from HH:MM:SS)
  const getDisplayTime = useCallback(() => {
    if (!reminder?.reminder_time) return '09:00';
    return reminder.reminder_time.substring(0, 5); // Remove seconds
  }, [reminder]);

  // Load reminder on mount and user change
  useEffect(() => {
    loadReminder();
  }, [loadReminder]);

  return {
    reminder,
    isLoading,
    error,
    saveReminder,
    deleteReminder,
    getDisplayTime,
    timezone: getUserTimezone()
  };
};