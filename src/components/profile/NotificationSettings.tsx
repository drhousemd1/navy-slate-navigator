import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Bell, BellOff, Smartphone, AlertTriangle } from 'lucide-react';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { toast } from '@/hooks/use-toast';

export const NotificationSettings: React.FC = () => {
  const { preferences, isLoading, isSaving, updateNotificationType, toggleNotifications } = useNotificationSettings();
  const { isSubscribed, isSupported, isLoading: subscriptionLoading, subscribe, unsubscribe } = usePushSubscription();

  const handleSubscriptionToggle = async () => {
    try {
      if (isSubscribed) {
        const success = await unsubscribe();
        if (success) {
          toast({
            title: 'Push notifications disabled',
            description: 'You will no longer receive push notifications.',
          });
        } else {
          toast({
            title: 'Error',
            description: 'Failed to disable push notifications.',
            variant: 'destructive',
          });
        }
      } else {
        const success = await subscribe();
        if (success) {
          toast({
            title: 'Push notifications enabled',
            description: 'You will now receive push notifications.',
          });
        } else {
          toast({
            title: 'Error',
            description: 'Failed to enable push notifications. Please check your browser settings.',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    try {
      await toggleNotifications(enabled);
      toast({
        title: enabled ? 'Notifications enabled' : 'Notifications disabled',
        description: enabled 
          ? 'You will receive notifications based on your preferences.'
          : 'All notifications have been disabled.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update notification settings.',
        variant: 'destructive',
      });
    }
  };

  const handleTypeToggle = async (type: keyof typeof preferences.types, enabled: boolean) => {
    try {
      await updateNotificationType(type, enabled);
      toast({
        title: 'Preference updated',
        description: `${getNotificationTypeLabel(type)} notifications ${enabled ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update notification preference.',
        variant: 'destructive',
      });
    }
  };

  const getNotificationTypeLabel = (type: keyof typeof preferences.types): string => {
    const labels = {
      ruleBroken: 'Rule violations',
      taskCompleted: 'Task completions',
      rewardPurchased: 'Reward purchases',
      rewardRedeemed: 'Reward redemptions',
      punishmentPerformed: 'Punishments applied',
      wellnessUpdated: 'Wellness updates',
      wellnessCheckin: 'Wellness reminders',
    };
    return labels[type] || type;
  };

  const getNotificationTypeDescription = (type: keyof typeof preferences.types): string => {
    const descriptions = {
      ruleBroken: 'When a rule is broken by you or your partner',
      taskCompleted: 'When tasks are completed',
      rewardPurchased: 'When rewards are purchased',
      rewardRedeemed: 'When rewards are redeemed',
      punishmentPerformed: 'When punishments are applied',
      wellnessUpdated: 'When wellness scores are updated',
      wellnessCheckin: 'Daily wellness check-in reminders',
    };
    return descriptions[type] || '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Configure your notification preferences and manage push subscriptions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Push Subscription */}
        <div className="space-y-4">
          <div>
            <h4 className="font-medium">Push Subscription</h4>
            <p className="text-sm text-muted-foreground">
              {isSupported 
                ? 'Enable push notifications to receive real-time updates'
                : 'Push notifications not available in this environment'
              }
            </p>
          </div>
          
          {isSupported ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4" />
                <div>
                  <Label className="font-medium">
                    {isSubscribed ? 'Subscribed to push notifications' : 'Not subscribed'}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {isSubscribed 
                      ? 'Your device will receive push notifications' 
                      : 'Subscribe to receive push notifications'
                    }
                  </p>
                </div>
              </div>
              <Button
                onClick={handleSubscriptionToggle}
                disabled={subscriptionLoading}
                variant={isSubscribed ? 'outline' : 'default'}
                size="sm"
              >
                {subscriptionLoading ? 'Loading...' : (isSubscribed ? 'Unsubscribe' : 'Subscribe')}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Browser push notifications unavailable</p>
                <p className="text-xs text-muted-foreground">
                  Notification preferences will still be saved for when push is available
                </p>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Notification Settings */}
        <div className="space-y-4">
          <div>
            <h4 className="font-medium">Notification Settings</h4>
            <p className="text-sm text-muted-foreground">
              Control when you receive notifications
            </p>
          </div>

          {/* Master toggle */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <Label htmlFor="notifications-enabled" className="font-medium">
                Enable Notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Master switch for all notifications
              </p>
            </div>
            <Switch
              id="notifications-enabled"
              checked={preferences.enabled}
              onCheckedChange={handleNotificationToggle}
              disabled={isLoading || isSaving}
            />
          </div>

          {/* Individual notification types */}
          {preferences.enabled && (
            <div className="space-y-3">
              {Object.entries(preferences.types).map(([type, enabled]) => (
                <div key={type} className="flex items-center justify-between">
                  <div>
                    <Label 
                      htmlFor={`notification-${type}`} 
                      className="font-medium"
                    >
                      {getNotificationTypeLabel(type as keyof typeof preferences.types)}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {getNotificationTypeDescription(type as keyof typeof preferences.types)}
                    </p>
                  </div>
                  <Switch
                    id={`notification-${type}`}
                    checked={enabled}
                    onCheckedChange={(checked) => 
                      handleTypeToggle(type as keyof typeof preferences.types, checked)
                    }
                    disabled={isLoading || isSaving}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {!isSubscribed && preferences.enabled && (
          <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm font-medium text-orange-900">
                Push subscription required
              </p>
              <p className="text-xs text-orange-700">
                Subscribe to push notifications above to receive these notifications.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};