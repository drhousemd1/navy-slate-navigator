import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { X, Bell, Wifi } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { toast } from '@/hooks/use-toast';
import WellnessReminderSettings from '@/components/profile/WellnessReminderSettings';

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { preferences, isLoading, isSaving, updateNotificationType, toggleNotifications } = useNotificationSettings();
  const { isSubscribed, isSupported, isLoading: pushLoading, subscribe, unsubscribe, requestPermissionImmediately } = usePushSubscription();

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
      if (enabled) {
        // First, request permission immediately (in user gesture context)
        if (isSupported) {
          const hasPermission = await requestPermissionImmediately();
          if (!hasPermission) {
            toast({
              title: 'Permission Required',
              description: 'Please allow notifications in your browser to enable push notifications.',
              variant: 'destructive',
            });
            return;
          }

          // Update database preferences first
          await toggleNotifications(enabled);
          
          // Then subscribe with permission already granted
          const success = await subscribe(true);
          if (!success) {
            toast({
              title: 'Warning',
              description: 'Notifications enabled but push subscription failed. Please try again.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Success',
              description: 'Push notifications enabled successfully!',
            });
          }
        } else {
          toast({
            title: 'Warning',
            description: 'Push notifications not supported by this browser.',
            variant: 'destructive',
          });
        }
      } else {
        // Disable notifications
        await toggleNotifications(enabled);
        if (isSubscribed) {
          await unsubscribe();
        }
        toast({
          title: 'Success',
          description: 'Push notifications disabled.',
        });
      }
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
    <AppLayout>
      <div className="container mx-auto px-4 py-8 text-white">
        <h1 className="text-3xl font-bold mb-8 text-center">Notification Settings</h1>

        <div className="max-w-2xl mx-auto bg-dark-navy p-8 rounded-lg shadow-xl border border-light-navy">
          <div className="space-y-6">
            {/* Header */}
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Push Notifications
            </h2>
            
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
                disabled={isLoading || isSaving || pushLoading}
              />
            </div>

            {/* Status */}
            <div className="flex items-center space-x-2">
              <Wifi className={`h-4 w-4 ${isSubscribed ? 'text-green-500' : 'text-gray-400'}`} />
              <p className="text-sm text-gray-400">
                Status: {isSupported ? (isSubscribed ? 'Subscribed' : 'Not subscribed') : 'Not supported'}
              </p>
            </div>

            {/* Notification Types */}
            <div className="space-y-4">
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

          {/* Wellness Reminder Settings */}
        <div className="mt-8">
          <WellnessReminderSettings />
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-8 flex justify-center">
          <Button
            onClick={() => navigate('/')}
            variant="default"
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Close
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Notifications;