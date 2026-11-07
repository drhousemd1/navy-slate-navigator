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
  return <section className="space-y-3 rounded border border-light-navy bg-navy p-4" aria-label="Push delivery on this device">
    <h3 className="text-white font-medium flex items-center gap-2"><Wifi className="h-4 w-4" />This device</h3>
    <p role="status" className="text-sm text-gray-300">{labels[device.status] ?? (device.isSupported ? 'Device status has not been checked' : 'This browser does not support push notifications')}</p>
    <p className="text-xs text-gray-400">Account preferences apply across your devices. These controls change push delivery on this browser only. Registration does not confirm that a notification has been delivered.</p>
    {device.error && <p role="alert" className="text-sm text-amber-200">{device.error}</p>}
    <div className="flex flex-wrap gap-2">
      {device.isSupported && !device.isSubscribed && <Button variant="outline" disabled={!device.canEnable} onClick={() => void device.subscribe()}>Enable this device</Button>}
      {(device.isSubscribed || device.hasBrowserSubscription || device.status === 'unavailable' || device.status === 'needs_setup') && <Button variant="outline" disabled={device.isLoading} onClick={() => void device.unsubscribe()}>Disable this device</Button>}
      <Button variant="ghost" disabled={device.isLoading} onClick={() => void device.checkSubscriptionStatus?.()}>Reload device status</Button>
    </div>
  </section>;
}
