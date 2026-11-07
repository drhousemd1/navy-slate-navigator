import { supabase } from '@/integrations/supabase/client';
import { getPushDevice, getPushTest, notificationError, requestPushTest } from '@/data/notifications/api';
import { readPushDeviceId } from '@/lib/pushDevice';
import { isPushTestTerminal, pushTestStatusText, readPushTestIntent, savePushTestIntent } from '@/lib/pushDeviceTest';

/** Read-only by default. Explicit test actions only request the fixed server
 * test for the signed-in account's current device; they cannot choose content. */
export async function pushNotificationTest(action: 'status' | 'test' | 'new-test' = 'status') {
  if (!['status', 'test', 'new-test'].includes(action)) return { status: 'unavailable', message: 'Choose status, test, or new-test.' };
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return { status: 'unavailable', message: 'Sign in before checking this device.' };
  let deviceId: string | null;
  try { deviceId = readPushDeviceId(); }
  catch { return { status: 'unavailable', message: 'Device storage could not be read.' }; }
  if (!deviceId) return { status: 'not_registered', message: 'Open notification settings to set up this device.' };
  try {
    const accountId = session.user.id;
    let intent = readPushTestIntent(accountId, deviceId);
    if (action === 'status') {
      if (intent) {
        const result = await getPushTest(accountId, intent.commandId);
        if (result && result.deviceId !== deviceId) throw new Error('INVALID_PUSH_TEST_RESPONSE');
        return { status: result?.status ?? 'unconfirmed', message: pushTestStatusText(result?.status ?? null) };
      }
      const state = await getPushDevice(accountId, deviceId);
      return { status: state.enabled ? 'registered' : 'disabled', message: 'Registration status does not confirm delivery.' };
    }
    if (action === 'new-test' && intent) {
      const previous = await getPushTest(accountId, intent.commandId);
      if (previous && previous.deviceId !== deviceId) throw new Error('INVALID_PUSH_TEST_RESPONSE');
      if (!isPushTestTerminal(previous?.status ?? null)) return { status: previous?.status ?? 'unconfirmed', message: 'The previous test is unresolved. Check its status or retry test with the same request.' };
      intent = null;
    }
    if (!intent) { intent = { deviceId, commandId: crypto.randomUUID() }; savePushTestIntent(accountId, intent); }
    await requestPushTest(accountId, deviceId, intent.commandId);
    const result = await getPushTest(accountId, intent.commandId);
    if (result && result.deviceId !== deviceId) throw new Error('INVALID_PUSH_TEST_RESPONSE');
    return { status: result?.status ?? 'accepted', message: pushTestStatusText(result?.status ?? null, true) };
  } catch (error) { return { status: 'unavailable', message: notificationError(error) }; }
}
if (typeof window !== 'undefined') {
  const target = window as unknown as { pushNotificationTest: typeof pushNotificationTest; testPush: () => ReturnType<typeof pushNotificationTest> };
  target.pushNotificationTest = pushNotificationTest;
  target.testPush = () => pushNotificationTest('test');
}
