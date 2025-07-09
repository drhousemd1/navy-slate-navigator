import { useWellnessReminderQuery } from './queries/useWellnessReminderQuery';
import { useCreateWellnessReminder, useUpdateWellnessReminder, useDeleteWellnessReminder } from './mutations';
import { CreateWellnessReminderData, UpdateWellnessReminderData } from './types';
import { useAuth } from '@/contexts/auth';
import { useCallback } from 'react';
import { logger } from '@/lib/logger';

export const useWellnessReminderData = () => {
  const { user } = useAuth();
  const userId = user?.id || null;

  // Queries
  const { data: reminder, isLoading, error } = useWellnessReminderQuery(userId);

  // Mutations
  const createMutation = useCreateWellnessReminder(userId);
  const updateMutation = useUpdateWellnessReminder(userId);
  const deleteMutation = useDeleteWellnessReminder(userId);

  // Helper functions
  const getUserTimezone = useCallback(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);

  const getDisplayTime = useCallback(() => {
    if (!reminder?.reminder_time) return '09:00';
    return reminder.reminder_time.substring(0, 5); // Remove seconds
  }, [reminder]);

  // Mutation functions
  const saveReminder = useCallback(async (
    enabled: boolean, 
    reminderTime: string // Format: "HH:MM"
  ): Promise<boolean> => {
    if (!userId) {
      logger.error('[useWellnessReminderData] No user ID available');
      return false;
    }

    try {
      const timezone = getUserTimezone();
      const timeWithSeconds = `${reminderTime}:00`; // Add seconds

      const reminderData = {
        enabled,
        reminder_time: timeWithSeconds,
        timezone
      };

      if (reminder) {
        // Update existing reminder
        await updateMutation.mutateAsync({ 
          id: reminder.id, 
          ...reminderData 
        });
      } else {
        // Create new reminder
        await createMutation.mutateAsync(reminderData);
      }

      logger.debug('[useWellnessReminderData] Reminder saved successfully');
      return true;
    } catch (err) {
      logger.error('[useWellnessReminderData] Error saving reminder:', err);
      return false;
    }
  }, [userId, reminder, getUserTimezone, updateMutation, createMutation]);

  const deleteReminder = useCallback(async (): Promise<boolean> => {
    if (!userId || !reminder) {
      logger.error('[useWellnessReminderData] No user ID or reminder available');
      return false;
    }

    try {
      await deleteMutation.mutateAsync(reminder.id);
      logger.debug('[useWellnessReminderData] Reminder deleted successfully');
      return true;
    } catch (err) {
      logger.error('[useWellnessReminderData] Error deleting reminder:', err);
      return false;
    }
  }, [userId, reminder, deleteMutation]);

  return {
    // Data
    reminder,
    isLoading: isLoading || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: error?.message || createMutation.error?.message || updateMutation.error?.message || deleteMutation.error?.message || null,
    
    // Actions
    saveReminder,
    deleteReminder,
    getDisplayTime,
    
    // Utilities
    timezone: getUserTimezone()
  };
};