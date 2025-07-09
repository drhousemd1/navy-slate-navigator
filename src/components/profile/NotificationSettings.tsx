import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { toastManager } from '@/lib/toastManager';
import WellnessReminderSettings from './WellnessReminderSettings';

const NOTIFICATION_TYPES = [
  {
    key: 'ruleBroken' as const,
    label: 'Rule Broken',
    description: 'Get notified when your partner marks a rule as broken'
  },
  {
    key: 'taskCompleted' as const,
    label: 'Task Completed',
    description: 'Get notified when your partner completes a task'
  },
  {
    key: 'rewardPurchased' as const,
    label: 'Reward Purchased',
    description: 'Get notified when your partner purchases a reward'
  },
  {
    key: 'rewardRedeemed' as const,
    label: 'Reward Redeemed',
    description: 'Get notified when your partner redeems a reward'
  },
  {
    key: 'punishmentPerformed' as const,
    label: 'Punishment Performed',
    description: 'Get notified when your partner applies a punishment'
  },
  {
    key: 'wellnessUpdated' as const,
    label: 'Wellness Updated',
    description: 'Get notified when your partner updates their wellness score'
  }
];

const NotificationSettings: React.FC = () => {
  const {
    preferences,
    isLoading,
    error,
    enableNotifications,
    disableNotifications,
    updateNotificationType
  } = useNotificationPreferences();

  const handleMainToggle = async () => {
    try {
      if (preferences.enabled) {
        const success = await disableNotifications();
        if (success) {
          toastManager.success('Notifications Disabled', 'Push notifications have been turned off.');
        }
      } else {
        const success = await enableNotifications();
        if (success) {
          toastManager.success('Notifications Enabled', 'Push notifications have been enabled.');
        } else if (error) {
          toastManager.error('Permission Required', error);
        }
      }
    } catch (err) {
      toastManager.error('Error', 'Failed to update notification settings.');
    }
  };

  const handleTypeToggle = async (type: keyof typeof preferences.types, enabled: boolean) => {
    try {
      await updateNotificationType(type, enabled);
    } catch (err) {
      toastManager.error('Error', 'Failed to update notification preference.');
    }
  };

  if (isLoading) {
    return (
      <div className="mb-8">
        <Label className="block text-sm font-medium text-gray-300 mb-1">Notification Settings</Label>
        <p className="text-gray-400 bg-navy p-3 rounded border border-light-navy">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 border-t border-light-navy pt-8 mt-8">
      <h2 className="text-xl font-semibold text-white flex items-center gap-2">
        <Bell className="w-5 h-5" />
        Notification Settings
      </h2>
      
      {/* Main notification toggle */}
      <div className="bg-navy p-4 rounded border border-light-navy space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {preferences.enabled ? (
              <Bell className="w-5 h-5 text-cyan-500" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <Label className="text-white font-medium">Push Notifications</Label>
              <p className="text-gray-400 text-sm">
                {preferences.enabled ? 'Notifications are enabled' : 'Enable push notifications'}
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.enabled}
            onCheckedChange={handleMainToggle}
            disabled={isLoading}
          />
        </div>

        {/* Individual notification type toggles */}
        <div className="pt-4 border-t border-light-navy space-y-3">
          <Label className="text-gray-300 text-sm">Notification Types</Label>
          {NOTIFICATION_TYPES.map((type) => (
            <div key={type.key} className={`flex items-center justify-between ${!preferences.enabled ? 'opacity-50' : ''}`}>
              <div>
                <Label className={`text-sm ${preferences.enabled ? 'text-white' : 'text-gray-500'}`}>{type.label}</Label>
                <p className={`text-xs ${preferences.enabled ? 'text-gray-400' : 'text-gray-600'}`}>{type.description}</p>
              </div>
              <Switch
                checked={preferences.enabled && preferences.types[type.key]}
                onCheckedChange={(enabled) => handleTypeToggle(type.key, enabled)}
                disabled={isLoading || !preferences.enabled}
              />
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Wellness Reminder Settings */}
      <WellnessReminderSettings />
    </div>
  );
};

export default NotificationSettings;