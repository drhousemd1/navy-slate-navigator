import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';
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

  const getNotificationTypeLabel = (type: keyof typeof preferences.types): string => {
    const labels = {
      ruleBroken: 'Rule Broken',
      taskCompleted: 'Task Completed',
      rewardPurchased: 'Reward Purchased',
      rewardRedeemed: 'Reward Redeemed',
      punishmentPerformed: 'Punishment Applied',
      wellnessUpdated: 'Wellness Updated',
      wellnessCheckin: 'Wellness Check-in',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Notifications</h3>
          <p className="text-sm text-muted-foreground">
            Status: {isSupported && isSubscribed ? 'Push supported' : 'Not available'}
          </p>
        </div>
        {isSupported && isSubscribed && (
          <Check className="h-5 w-5 text-green-500" />
        )}
      </div>

      {/* Notification toggles */}
      <div className="space-y-4">
        {Object.entries(preferences.types).map(([type, enabled]) => (
          <div key={type} className="flex items-center justify-between py-2">
            <Label 
              htmlFor={`notification-${type}`} 
              className="text-base font-normal"
            >
              {getNotificationTypeLabel(type as keyof typeof preferences.types)}
            </Label>
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
    </div>
  );
};