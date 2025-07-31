import React from 'react';
import AppLayout from '@/components/AppLayout';
import { PushNotificationDebugPanel } from '@/components/debug/PushNotificationDebugPanel';

const Debug = () => {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Debug Panel</h1>
        <PushNotificationDebugPanel />
      </div>
    </AppLayout>
  );
};

export default Debug;