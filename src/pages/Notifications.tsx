import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { X, Bell } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { PushDeviceSettings } from '@/components/profile/PushDeviceSettings';
import { toast } from '@/hooks/use-toast';
import WellnessReminderSettings from '@/components/profile/WellnessReminderSettings';

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { preferences, isLoading, isSaving, isReady, loadError, loadPreferences, updateNotificationType, toggleNotifications } = useNotificationSettings();

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
    try { await toggleNotifications(enabled); }
    catch { toast({ title: 'Error', description: 'Your account preference could not be confirmed. Reload its saved state.', variant: 'destructive' }); }
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
      rewardRefunded: {
        title: 'Points Refunded',
        description: 'Get notified when unused rewards are refunded'
      },
      punishmentPerformed: {
        title: 'Punishment Performed',
        description: 'Get notified when your partner applies a punishment'
      },
      wellnessUpdated: {
        title: 'Wellness Updated',
        description: 'Get notified when your partner updates their wellness score'
      },
      wellnessCheckin: {
        title: 'Wellness Check-in',
        description: 'Get your daily wellness reminder'
      },
      messages: {
        title: 'Messages',
        description: 'Get notified when you receive a new message from your partner'
      }
    };
    return typeInfo[type] || { title: type, description: '' };
  };

  const notificationTypes = Object.entries(preferences.types);

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
            
            {isLoading && <p role="status" className="text-gray-400 text-sm">Loading notification preferences…</p>}
            {loadError && <div className="space-y-2">
              <p role="alert" className="text-sm text-red-300">{loadError}</p>
              <Button variant="outline" disabled={isLoading || isSaving} onClick={() => void loadPreferences()}>Retry notification preferences</Button>
            </div>}

            {/* Master Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className={`w-5 h-5 ${preferences.enabled ? 'text-cyan-500' : 'text-gray-400'}`} />
                <div>
                  <p className="text-white font-medium">Push Notifications</p>
                  <p className="text-gray-400 text-sm">Enable notifications across your devices</p>
                </div>
              </div>
              <Switch
                checked={preferences.enabled}
                aria-label="Push Notifications"
                onCheckedChange={handleMasterToggle}
                disabled={!isReady || isLoading || isSaving}
              />
            </div>

            <PushDeviceSettings />

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
                        aria-label={typeInfo.title}
                        onCheckedChange={(checked) => 
                          handleTypeToggle(type as keyof typeof preferences.types, checked)
                        }
                        disabled={!isReady || isLoading || isSaving || !preferences.enabled}
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
