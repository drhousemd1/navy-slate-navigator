import { supabaseBackendId } from '@/integrations/supabase/client';
import type { PushTestStatus } from '@/data/notifications/api';

export interface PushTestIntent { deviceId: string; commandId: string }
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const key = (accountId: string, deviceId: string) => `obedience:push-test:v1:${supabaseBackendId}:${accountId}:${deviceId}`;
export function readPushTestIntent(accountId: string, deviceId: string): PushTestIntent | null {
  const raw = localStorage.getItem(key(accountId, deviceId));
  if (!raw) return null;
  const value = JSON.parse(raw);
  if (value.deviceId !== deviceId || !uuid.test(value.commandId ?? '')) throw new Error('PUSH_TEST_STORAGE_INVALID');
  return { deviceId, commandId: value.commandId };
}
export function savePushTestIntent(accountId: string, intent: PushTestIntent): void {
  localStorage.setItem(key(accountId, intent.deviceId), JSON.stringify(intent));
}
export function pushTestStatusText(status: PushTestStatus['status'] | null, accepted = false): string {
  if (status === 'queued') return 'Test queued for this device. Delivery is not yet confirmed.';
  if (status === 'acceptedByPushService') return 'The push service accepted the test. This does not confirm it appeared on your device.';
  if (status === 'skipped') return 'The test was skipped because delivery was not eligible.';
  if (status === 'failed') return 'The test could not be accepted by the push service.';
  return accepted ? 'The test request was accepted. Check its current status.' : 'No confirmed test result is available. Check its status or retry this same test.';
}
export function isPushTestTerminal(status: PushTestStatus['status'] | null): boolean {
  return status === 'acceptedByPushService' || status === 'skipped' || status === 'failed';
}
