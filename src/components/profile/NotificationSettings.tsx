import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, BellOff, AlertTriangle, Smartphone, Wifi } from 'lucide-react';
import { useNotificationPreferencesQuery } from '@/data/notifications';
import { useNotificationManager } from '@/hooks/useNotificationManager';
import type { NotificationPreferences } from '@/data/notifications/types';
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
  const { data: preferences, isLoading } = useNotificationPreferencesQuery();
  const { 
    enableNotifications, 
    disableNotifications, 
    updateNotificationType, 
    pushSupported, 
    pushError, 
    isMobile, 
    isIOS 
  } = useNotificationManager();

  const handleMainToggle = async () => {
    if (!preferences) {
      console.warn('Cannot toggle notifications - preferences not loaded');
      return;
    }
    
    console.log('Toggling notifications from:', preferences.enabled);
    
    if (preferences.enabled) {
      await disableNotifications();
    } else {
      await enableNotifications();
    }
  };

  const handleTypeToggle = (type: keyof NotificationPreferences['types'], enabled: boolean) => {
    if (!preferences) {
      console.warn('Cannot toggle notification type - preferences not loaded');
      return;
    }
    updateNotificationType(type, enabled);
  };

  if (isLoading || !preferences) {
    return (
      <div className="space-y-6 border-t border-light-navy pt-8 mt-8">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Settings
        </h2>
        <div className="bg-navy p-4 rounded border border-light-navy">
          <div className="text-white">Loading notification settings...</div>
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
      
      {/* Mobile/iOS specific warnings */}
      {(isMobile || pushError) && (
        <div className="bg-navy border border-light-navy rounded p-4">
          <div className="flex items-start gap-3">
            {isMobile ? (
              <Smartphone className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            )}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-yellow-500">
                {isMobile ? 'Mobile Device Detected' : 'Notification Status'}
              </h3>
              <div className="space-y-1">
                {pushError && (
                  <p className="text-sm text-gray-300">{pushError}</p>
                )}
                {isIOS && (
                  <p className="text-sm text-gray-400">
                    💡 For best experience on iOS, add this app to your home screen
                  </p>
                )}
                {isMobile && pushSupported === false && (
                  <p className="text-sm text-gray-400">
                    Notification preferences will still be saved for in-app notifications
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Wifi className="w-3 h-3" />
                <span>Status: {pushSupported ? 'Push supported' : 'Push not available'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

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
            disabled={pushSupported === null} // Disable while checking support
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