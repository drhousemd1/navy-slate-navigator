import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Check } from 'lucide-react';
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
    const typeInfo = {
      ruleBroken: {
        title: 'Rule Broken',
        description: 'Get notified when your partner marks a rule as broken'
      },
      taskCompleted: {
        title: 'Task Completed',
        description: 'Get notified when your partner completes a task'
      },
      rewardPurchased: {
        title: 'Reward Purchased',
        description: 'Get notified when your partner purchases a reward'
      },
      rewardRedeemed: {
        title: 'Reward Redeemed',
        description: 'Get notified when your partner redeems a reward'
      },
      punishmentPerformed: {
        title: 'Punishment Applied',
        description: 'Get notified when your partner applies a punishment'
      },
      wellnessUpdated: {
        title: 'Wellness Updated',
        description: 'Get notified when your partner updates their wellness score'
      }
    };
    return typeInfo[type] || { title: type, description: '' };
  };

  // Filter out wellnessCheckin since it has its own section
  const notificationTypes = Object.entries(preferences.types).filter(([type]) => type !== 'wellnessCheckin');

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">Notifications</h3>
          <p className="text-sm text-muted-foreground">
            Status: Push supported
          </p>
        </div>
        <Check className="h-5 w-5 text-green-500" />
      </div>

      {/* Master Toggle */}
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center space-x-3">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <div>
            <Label className="text-base font-medium text-foreground">
              Push Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Enable push notifications
            </p>
          </div>
        </div>
        <Switch
          checked={preferences.enabled}
          onCheckedChange={handleMasterToggle}
          disabled={isLoading || isSaving}
        />
      </div>

      {/* Notification Type Toggles */}
      <div className="space-y-4">
        {notificationTypes.map(([type, enabled]) => {
          const typeInfo = getNotificationTypeInfo(type as keyof typeof preferences.types);
          return (
            <div key={type} className="flex items-center justify-between py-3">
              <div className="flex-1">
                <Label 
                  htmlFor={`notification-${type}`} 
                  className="text-base font-medium text-foreground block"
                >
                  {typeInfo.title}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {typeInfo.description}
                </p>
              </div>
              <Switch
                id={`notification-${type}`}
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
  );
};