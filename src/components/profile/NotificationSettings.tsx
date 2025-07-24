import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Bell, Wifi } from 'lucide-react';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { toast } from '@/hooks/use-toast';

export const NotificationSettings: React.FC = () => {
  const { preferences, isLoading, isSaving, updateNotificationType, toggleNotifications } = useNotificationSettings();
  const { isSubscribed, isSupported } = usePushSubscription();

  const handleTypeToggle = async (type: keyof typeof preferences.types, enabled: boolean) => {
    try {
      await updateNotificationType(type, enabled);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update notification preference.',
        variant: 'destructive',
      });
    }
  };

  const handleMasterToggle = async (enabled: boolean) => {
    try {
      await toggleNotifications(enabled);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update notifications.',
        variant: 'destructive',
      });
    }
  };

  const getNotificationTypeInfo = (type: keyof typeof preferences.types) => {
    // Direct key mapping like the other working toggles
    if (type === 'ruleBroken') {
      return { title: 'Rule Broken', description: 'Get notified when your partner marks a rule as broken' };
    }
    if (type === 'taskCompleted') {
      return { title: 'Task Completed', description: 'Get notified when your partner completes a task' };
    }
    if (type === 'rewardPurchased') {
      return { title: 'Reward Purchased', description: 'Get notified when your partner purchases a reward' };
    }
    if (type === 'rewardRedeemed') {
      return { title: 'Reward Redeemed', description: 'Get notified when your partner redeems a reward' };
    }
    if (type === 'punishmentPerformed') {
      return { title: 'Punishment Performed', description: 'Get notified when your partner applies a punishment' };
    }
    if (type === 'wellnessUpdated') {
      return { title: 'Wellness Updated', description: 'Get notified when your partner updates their wellness score' };
    }
    if (type === 'wellnessCheckin') {
      return { title: 'Wellness Check-in', description: 'Get notified for wellness check-in reminders' };
    }
    if (type === 'messages') {
      return { title: 'Messages', description: 'Get notified when you receive a new message from your partner' };
    }
    
    return { title: type, description: '' };
  };

  // Filter out wellnessCheckin since it has its own section
  const notificationTypes = Object.entries(preferences.types).filter(([type]) => type !== 'wellnessCheckin');

  return (
    <div className="space-y-6 border-t border-light-navy pt-8 mt-8">
      {/* Header like Wellness section */}
      <h2 className="text-xl font-semibold text-white flex items-center gap-2">
        <Bell className="w-5 h-5" />
        Push Notifications
      </h2>
      
      <div className="bg-navy p-4 rounded border border-light-navy space-y-4">
        {/* Master Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className={`w-5 h-5 ${preferences.enabled ? 'text-cyan-500' : 'text-gray-400'}`} />
            <div>
              <p className="text-white font-medium">Push Notifications</p>
              <p className="text-gray-400 text-sm">Enable push notifications</p>
            </div>
          </div>
          <Switch
            checked={preferences.enabled}
            onCheckedChange={handleMasterToggle}
            disabled={isLoading || isSaving}
          />
        </div>

        {/* Status */}
        <div className="flex items-center space-x-2">
          <Wifi className="h-4 w-4 text-gray-400" />
          <p className="text-sm text-gray-400">Status: Push supported</p>
        </div>

        {/* Notification Types */}
        <div className="pt-4 border-t border-light-navy space-y-4">
          <h4 className="text-white font-medium">Notification Types</h4>
          <div className="space-y-4">
            {notificationTypes.map(([type, enabled]) => {
              const typeInfo = getNotificationTypeInfo(type as keyof typeof preferences.types);
              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex-1">
                    <h5 className="text-white font-medium">{typeInfo.title}</h5>
                    <p className="text-gray-400 text-sm">{typeInfo.description}</p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => 
                      handleTypeToggle(type as keyof typeof preferences.types, checked)
                    }
                    disabled={isLoading || isSaving || !preferences.enabled}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};