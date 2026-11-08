import React from 'react';
import { Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushSubscription } from '@/hooks/usePushSubscription';

export function PushDeviceSettings() {
  const device = usePushSubscription();
  const labels = {
    checking: 'Checking this device…', enabled: 'Registered on this device', disabled: 'Not enabled on this device',
    needs_setup: 'This browser needs setup for this account', unavailable: 'Device status could not be confirmed', unsupported: 'This browser does not support push notifications',
  };
  return <section className="space-y-2" aria-label="Push delivery on this device">
    <div className="flex items-center gap-2">
      <Wifi aria-hidden="true" className={`h-4 w-4 shrink-0 ${device.isSubscribed ? 'text-green-500' : 'text-gray-400'}`} />
      <p role="status" className="text-sm text-gray-400">This device: {labels[device.status] ?? (device.isSupported ? 'Device status has not been checked' : 'This browser does not support push notifications')}</p>
    </div>
    {device.error && <p role="alert" className="text-sm text-amber-200">{device.error}</p>}
    <div className="flex flex-wrap gap-2">
      {device.isSupported && !device.isSubscribed && <Button size="sm" variant="outline" disabled={!device.canEnable} onClick={() => void device.subscribe()}>Enable this device</Button>}
      {(device.isSubscribed || device.hasBrowserSubscription || device.status === 'unavailable' || device.status === 'needs_setup') && <Button size="sm" variant="outline" disabled={device.isLoading} onClick={() => void device.unsubscribe()}>Disable this device</Button>}
      <Button size="sm" variant="ghost" disabled={device.isLoading} onClick={() => void device.checkSubscriptionStatus?.()}>Reload device status</Button>
    </div>
  </section>;
}
