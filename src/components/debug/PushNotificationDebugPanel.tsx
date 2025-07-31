import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { usePartnerHelper } from '@/hooks/usePartnerHelper';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

export const PushNotificationDebugPanel: React.FC = () => {
  const { user } = useAuth();
  const { sendNotification } = usePushNotifications();
  const { isSubscribed, isSupported } = usePushSubscription();
  const { getPartnerId } = usePartnerHelper();
  
  const [testTitle, setTestTitle] = useState('Test Notification');
  const [testBody, setTestBody] = useState('This is a test notification');
  const [targetUserId, setTargetUserId] = useState('');
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const testDirectEdgeFunction = async () => {
    if (!user) {
      addToLog('❌ No authenticated user');
      return;
    }

    setIsTesting(true);
    addToLog('🚀 Starting direct edge function test...');

    try {
      addToLog(`📤 Calling edge function with title: "${testTitle}"`);
      
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          targetUserId: targetUserId || user.id,
          type: 'test',
          title: testTitle,
          body: testBody,
          data: { source: 'debug_panel' }
        }
      });

      if (error) {
        addToLog(`❌ Edge function error: ${error.message}`);
      } else {
        addToLog(`✅ Edge function response: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (error) {
      addToLog(`💥 Exception calling edge function: ${error}`);
    } finally {
      setIsTesting(false);
    }
  };

  const testViaHook = async () => {
    if (!user) {
      addToLog('❌ No authenticated user');
      return;
    }

    setIsTesting(true);
    addToLog('🎯 Testing via usePushNotifications hook...');

    try {
      const success = await sendNotification({
        targetUserId: targetUserId || user.id,
        type: 'test',
        title: testTitle,
        body: testBody,
        data: { source: 'hook_test' }
      });

      addToLog(`${success ? '✅' : '❌'} Hook test result: ${success}`);
    } catch (error) {
      addToLog(`💥 Hook test exception: ${error}`);
    } finally {
      setIsTesting(false);
    }
  };

  const testPartnerNotification = async () => {
    if (!user) {
      addToLog('❌ No authenticated user');
      return;
    }

    setIsTesting(true);
    addToLog('👥 Testing partner notification...');

    try {
      addToLog('🔍 Getting partner ID...');
      const partnerId = await getPartnerId();
      
      if (!partnerId) {
        addToLog('❌ No partner ID found');
        setIsTesting(false);
        return;
      }

      addToLog(`✅ Partner ID found: ${partnerId}`);
      
      const success = await sendNotification({
        targetUserId: partnerId,
        type: 'test',
        title: 'Partner Test Notification',
        body: 'This is a test notification sent to your partner',
        data: { source: 'partner_test' }
      });

      addToLog(`${success ? '✅' : '❌'} Partner notification result: ${success}`);
    } catch (error) {
      addToLog(`💥 Partner notification exception: ${error}`);
    } finally {
      setIsTesting(false);
    }
  };

  const checkSubscriptionStatus = async () => {
    addToLog('🔍 Checking subscription status...');
    
    if (!user) {
      addToLog('❌ No authenticated user');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_push_subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        addToLog(`❌ Database error: ${error.message}`);
      } else {
        addToLog(`📊 Found ${data?.length || 0} subscription(s) in database`);
        data?.forEach((sub, index) => {
          addToLog(`  ${index + 1}. Endpoint: ${sub.endpoint.substring(0, 50)}...`);
        });
      }

      addToLog(`🌐 Browser support: ${isSupported ? 'Yes' : 'No'}`);
      addToLog(`📱 Current browser subscribed: ${isSubscribed ? 'Yes' : 'No'}`);
    } catch (error) {
      addToLog(`💥 Subscription check exception: ${error}`);
    }
  };

  const clearLog = () => {
    setDebugLog([]);
  };

  if (!user) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Push Notification Debug Panel</CardTitle>
          <CardDescription>Please log in to use the debug panel</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Push Notification Debug Panel</CardTitle>
        <CardDescription>Test and debug push notification functionality</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="testTitle">Test Title</Label>
            <Input
              id="testTitle"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              placeholder="Test notification title"
            />
          </div>
          <div>
            <Label htmlFor="targetUserId">Target User ID (optional)</Label>
            <Input
              id="targetUserId"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              placeholder="Leave empty for self"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="testBody">Test Body</Label>
          <Textarea
            id="testBody"
            value={testBody}
            onChange={(e) => setTestBody(e.target.value)}
            placeholder="Test notification body"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button 
            onClick={checkSubscriptionStatus}
            variant="outline"
            disabled={isTesting}
          >
            Check Subscriptions
          </Button>
          
          <Button 
            onClick={testDirectEdgeFunction}
            disabled={isTesting}
          >
            Test Edge Function
          </Button>
          
          <Button 
            onClick={testViaHook}
            variant="secondary"
            disabled={isTesting}
          >
            Test Via Hook
          </Button>
          
          <Button 
            onClick={testPartnerNotification}
            variant="destructive"
            disabled={isTesting}
          >
            Test Partner Notification
          </Button>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <Label>Debug Log</Label>
            <Button onClick={clearLog} variant="outline" size="sm">
              Clear Log
            </Button>
          </div>
          <div className="bg-black text-green-400 p-4 rounded-md h-64 overflow-y-auto font-mono text-sm">
            {debugLog.length === 0 ? (
              <div className="text-gray-500">No debug messages yet...</div>
            ) : (
              debugLog.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};