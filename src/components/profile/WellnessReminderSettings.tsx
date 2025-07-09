import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Clock, Bell, Calendar } from 'lucide-react';
import { TimePicker } from '@/components/ui/time-picker';
import { useWellnessReminders } from '@/hooks/useWellnessReminders';
import { toastManager } from '@/lib/toastManager';

const WellnessReminderSettings: React.FC = () => {
  const {
    reminder,
    isLoading,
    error,
    saveReminder,
    getDisplayTime,
    timezone
  } = useWellnessReminders();

  const [localTime, setLocalTime] = useState(() => getDisplayTime());
  const [isEnabled, setIsEnabled] = useState(() => reminder?.enabled || false);
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when reminder data loads
  React.useEffect(() => {
    if (reminder) {
      setIsEnabled(reminder.enabled);
      setLocalTime(getDisplayTime());
    }
  }, [reminder, getDisplayTime]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const success = await saveReminder(isEnabled, localTime);
      if (success) {
        toastManager.success(
          'Reminder Updated', 
          isEnabled 
            ? `Wellness reminder set for ${localTime} daily` 
            : 'Wellness reminder disabled'
        );
      }
    } catch (err) {
      toastManager.error('Error', 'Failed to update wellness reminder');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (enabled: boolean) => {
    setIsEnabled(enabled);
  };

  const formatNextReminder = () => {
    if (!isEnabled || !localTime) return null;
    
    const now = new Date();
    const [hours, minutes] = localTime.split(':').map(Number);
    const nextReminder = new Date();
    nextReminder.setHours(hours, minutes, 0, 0);
    
    // If the time has passed today, set it for tomorrow
    if (nextReminder <= now) {
      nextReminder.setDate(nextReminder.getDate() + 1);
    }
    
    return nextReminder.toLocaleString('en-US', {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const hasChanges = () => {
    if (!reminder) return isEnabled || localTime !== '09:00';
    return reminder.enabled !== isEnabled || getDisplayTime() !== localTime;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-light-navy rounded animate-pulse"></div>
        <div className="h-20 bg-light-navy rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 border-t border-light-navy pt-8 mt-8">
      <h2 className="text-xl font-semibold text-white flex items-center gap-2">
        <Clock className="w-5 h-5" />
        Wellness Check-in Reminders
      </h2>
      
      <div className="bg-navy p-4 rounded border border-light-navy space-y-4">
        {/* Main toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className={`w-5 h-5 ${isEnabled ? 'text-cyan-500' : 'text-gray-400'}`} />
            <div>
              <Label className="text-white font-medium">Daily Wellness Reminder</Label>
              <p className="text-gray-400 text-sm">
                Get reminded to update your wellness score
              </p>
            </div>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isSaving}
          />
        </div>

        {/* Time picker section */}
        {isEnabled && (
          <div className="pt-4 border-t border-light-navy space-y-4">
            <div>
              <Label className="text-gray-300 text-sm mb-2 block">Reminder Time</Label>
              <div className="flex items-center gap-4">
                <TimePicker
                  value={localTime}
                  onChange={setLocalTime}
                  disabled={isSaving}
                />
                <div className="text-sm text-gray-400">
                  {timezone.replace('_', ' ')}
                </div>
              </div>
            </div>

            {/* Next reminder preview */}
            {formatNextReminder() && (
              <div className="bg-light-navy/30 p-3 rounded border border-light-navy/50">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-cyan-500" />
                  <span className="text-gray-300">Next reminder:</span>
                  <span className="text-white font-medium">{formatNextReminder()}</span>
                </div>
              </div>
            )}

            {/* Save button */}
            {hasChanges() && (
              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {isSaving ? 'Saving...' : 'Save Reminder'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Info section */}
        <div className="text-xs text-gray-500 mt-4 p-3 bg-light-navy/20 rounded">
          <p className="mb-1">💡 <strong>Personal Reminder:</strong> This notification will be sent to you only (not your partner)</p>
          <p>⏰ <strong>Daily Schedule:</strong> Reminders are sent at your chosen time every day when enabled</p>
        </div>
      </div>
    </div>
  );
};

export default WellnessReminderSettings;