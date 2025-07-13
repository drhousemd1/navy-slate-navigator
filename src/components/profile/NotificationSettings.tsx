import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, BellOff } from 'lucide-react';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import type { NotificationPreferences } from '@/data/notifications/types';
import WellnessReminderSettings from './WellnessReminderSettings';
import { toast } from '@/hooks/use-toast';

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
  const { preferences, loading, savePreferences } = useNotificationSettings();

  const handleMainToggle = async () => {
    if (!preferences) return;
    
    const newPreferences = {
      ...preferences,
      enabled: !preferences.enabled
    };
    
    const success = await savePreferences(newPreferences);
    if (success) {
      toast({
        title: newPreferences.enabled ? 'Notifications Enabled' : 'Notifications Disabled',
        description: newPreferences.enabled 
          ? 'You will receive notifications' 
          : 'You will no longer receive notifications'
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to update notification settings',
        variant: 'destructive'
      });
    }
  };

  const handleTypeToggle = async (type: keyof NotificationPreferences['types'], enabled: boolean) => {
    if (!preferences) return;
    
    const newPreferences = {
      ...preferences,
      types: {
        ...preferences.types,
        [type]: enabled
      }
    };
    
    const success = await savePreferences(newPreferences);
    if (!success) {
      toast({
        title: 'Error',
        description: 'Failed to update notification settings',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 border-t border-light-navy pt-8 mt-8">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Settings
        </h2>
        <div className="bg-navy p-4 rounded border border-light-navy">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-light-navy rounded w-1/3"></div>
            <div className="h-8 bg-light-navy rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="space-y-6 border-t border-light-navy pt-8 mt-8">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Settings
        </h2>
        <div className="bg-navy p-4 rounded border border-light-navy">
          <p className="text-gray-400">Failed to load notification settings</p>
        </div>
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
              <Label className="text-white font-medium">Notifications</Label>
              <p className="text-gray-400 text-sm">
                {preferences.enabled ? 'Notifications are enabled' : 'Enable notifications'}
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.enabled}
            onCheckedChange={handleMainToggle}
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
                checked={preferences.types[type.key] || false}
                onCheckedChange={(enabled) => handleTypeToggle(type.key, enabled)}
                disabled={!preferences.enabled}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Wellness Reminder Settings */}
      <WellnessReminderSettings />
    </div>
  );
};

export default NotificationSettings;