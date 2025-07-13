import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Lightbulb, Smartphone, Wifi } from 'lucide-react';
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
        title: 'Punishment Performed',
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
    <div className="space-y-4">
      {/* Mobile Device Detected Banner */}
      <div className="border border-yellow-500/30 rounded-lg p-4 bg-yellow-500/5">
        <div className="flex items-start space-x-3">
          <Smartphone className="h-5 w-5 text-yellow-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-base font-medium text-yellow-500 mb-2">Mobile Device Detected</h3>
            <div className="flex items-start space-x-2 mb-3">
              <Lightbulb className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                For best experience on iOS, add this app to your home screen
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Wifi className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Status: Push supported</p>
            </div>
          </div>
        </div>
      </div>

      {/* Push Notifications Section */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="text-base font-medium text-foreground">Push Notifications</h3>
              <p className="text-sm text-muted-foreground">Enable push notifications</p>
            </div>
          </div>
          <Switch
            checked={preferences.enabled}
            onCheckedChange={handleMasterToggle}
            disabled={isLoading || isSaving}
          />
        </div>

        {/* Notification Types */}
        <div>
          <h4 className="text-base font-medium text-foreground mb-4">Notification Types</h4>
          <div className="space-y-4">
            {notificationTypes.map(([type, enabled]) => {
              const typeInfo = getNotificationTypeInfo(type as keyof typeof preferences.types);
              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex-1">
                    <h5 className="text-base font-medium text-foreground">{typeInfo.title}</h5>
                    <p className="text-sm text-muted-foreground">{typeInfo.description}</p>
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