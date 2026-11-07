import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { usePushDeviceTest } from '@/hooks/usePushDeviceTest';
import { pushTestStatusText } from '@/lib/pushDeviceTest';

export const PushNotificationDebugPanel: React.FC = () => {
  const { user } = useAuth(); const accountId = user?.id ?? null;
  const device = usePushSubscription();
  const test = usePushDeviceTest(accountId);
  const [log, setLog] = useState<{ accountId: string; text: string }[]>([]);
  const current = useRef(accountId); current.current = accountId;
  const check = async () => {
    if (!accountId) return;
    await device.checkSubscriptionStatus();
    if (current.current === accountId) setLog(previous => [...previous, { accountId, text: `${new Date().toLocaleTimeString()} · Device status reloaded. Review the current status below.` }]);
  };
  return <Card className="w-full max-w-2xl mx-auto">
    <CardHeader><CardTitle>Push Notification Debug Panel</CardTitle><CardDescription>{user ? 'Check push registration for this browser without sending to another account.' : 'Please log in to inspect this device.'}</CardDescription></CardHeader>
    {user && <CardContent className="space-y-4">
      <p role="status">{device.isLoading ? 'Checking this device…' : device.isSubscribed ? 'This device has a confirmed registration.' : device.status === 'disabled' ? 'This device is not enabled for this account.' : 'Device registration is not confirmed.'}</p>
      {device.error && <p role="alert" className="text-sm text-amber-200">{device.error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={device.isLoading} onClick={() => void check()}>Check this device</Button>
        <Button disabled={!device.isSubscribed || !test.canStartNew} onClick={() => void test.requestNew()}>{test.intent ? 'Request a new device test' : 'Test this device'}</Button>
        {test.intent && <Button variant="outline" disabled={test.pending} onClick={() => void test.check()}>Check test status</Button>}
        {test.intent && test.status === null && <Button variant="outline" disabled={test.pending || !device.isSubscribed} onClick={() => void test.retrySame()}>Retry same test</Button>}
      </div>
      {test.pending && <p role="status">Checking the test request…</p>}
      {test.intent && !test.pending && <p role="status">{pushTestStatusText(test.status, test.accepted)}</p>}
      {test.error && <p role="alert" className="text-sm text-amber-200">{test.error}</p>}
      <p className="text-sm text-gray-400">A device test uses a fixed notification for this browser and your account only. A queued request or push-service acceptance does not prove it appeared on your device.</p>
      <div className="border-t pt-4"><div className="flex justify-between items-center mb-2"><span>Debug Log</span><Button variant="outline" size="sm" onClick={() => setLog([])}>Clear Log</Button></div><div className="bg-black text-green-400 p-4 rounded-md h-64 overflow-y-auto font-mono text-sm">{log.filter(item => item.accountId === accountId).map((item, index) => <div key={index}>{item.text}</div>)}</div></div>
    </CardContent>}
  </Card>;
};
