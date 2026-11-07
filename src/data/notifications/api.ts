import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const deviceState = z.object({ deviceId: z.string().uuid(), subscriptionId: z.string().uuid().nullable(),
  enabled: z.boolean(), vapidKeyId: z.string().regex(/^[a-f0-9]{64}$/).nullable() }).strict();
const testReceipt = z.object({ commandId: z.string().uuid(), deviceId: z.string().uuid(), jobId: z.string().uuid() }).strict();
const testStatus = testReceipt.extend({ status: z.enum(['queued', 'skipped', 'acceptedByPushService', 'failed']) }).strict();
export type PushTestReceipt = z.infer<typeof testReceipt>;
export type PushTestStatus = z.infer<typeof testStatus>;
export type PushDeviceState = z.infer<typeof deviceState>;
export interface DeviceRegistration {
  deviceId: string; endpoint: string; p256dh: string; auth: string; vapidKeyId: string;
}
const reminder = z.object({ id: z.string().uuid(), user_id: z.string().uuid(), enabled: z.boolean(),
  reminder_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/), timezone: z.string(),
  last_sent: z.string().nullable(), next_due_at: z.string().nullable(), created_at: z.string(), updated_at: z.string(),
}).strict();
export type WellnessReminderState = z.infer<typeof reminder>;

async function token(accountId: string, signal?: AbortSignal) {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (error || !session?.access_token || session.user.id !== accountId) throw new Error('NOTIFICATION_ACCOUNT_CHANGED');
  return session.access_token;
}
// Additive migration RPCs are not represented in the legacy generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const database = supabase as any;
export const NOTIFICATION_REQUEST_TIMEOUT_MS = 10_000;
async function call(accountId: string, name: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const forwardAbort = () => controller.abort(signal?.reason ?? new DOMException('Cancelled', 'AbortError'));
  if (signal?.aborted) { forwardAbort(); throw controller.signal.reason; }
  signal?.addEventListener('abort', forwardAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error('NOTIFICATION_REQUEST_TIMEOUT')), NOTIFICATION_REQUEST_TIMEOUT_MS);
  let rejectAbort!: (reason: unknown) => void;
  const aborted = new Promise<never>((_resolve, reject) => { rejectAbort = reject; });
  const onAbort = () => rejectAbort(controller.signal.reason);
  controller.signal.addEventListener('abort', onAbort, { once: true });
  try {
    return await Promise.race([aborted, (async () => {
      const jwt = await token(accountId, controller.signal);
      const { data, error } = await database.rpc(name, args).setHeader('Authorization', `Bearer ${jwt}`).abortSignal(controller.signal);
      if (controller.signal.aborted) throw controller.signal.reason;
      if (error) throw new Error(error.message || 'NOTIFICATION_REQUEST_FAILED');
      await token(accountId, controller.signal); // Late responses cannot populate a new account.
      return data;
    })()]);
  } finally {
    clearTimeout(timer); signal?.removeEventListener('abort', forwardAbort);
    controller.signal.removeEventListener('abort', onAbort);
  }
}
function decodeDevice(value: unknown, deviceId: string): PushDeviceState {
  const result = deviceState.parse(value);
  if (result.deviceId !== deviceId || (result.enabled && (!result.subscriptionId || !result.vapidKeyId))) throw new Error('INVALID_DEVICE_RESPONSE');
  return result;
}
export async function getPushDevice(accountId: string, deviceId: string, signal?: AbortSignal) {
  return decodeDevice(await call(accountId, 'get_my_push_device', { p_device_id: deviceId }, signal), deviceId);
}
export async function registerPushDevice(accountId: string, value: DeviceRegistration, signal?: AbortSignal) {
  const result = decodeDevice(await call(accountId, 'register_my_push_device', { p_device_id: value.deviceId, p_endpoint: value.endpoint,
    p_p256dh: value.p256dh, p_auth: value.auth, p_vapid_key_id: value.vapidKeyId }, signal), value.deviceId);
  if (!result.enabled || result.vapidKeyId !== value.vapidKeyId) throw new Error('INVALID_DEVICE_RESPONSE');
  return result;
}
export async function revokePushDevice(accountId: string, deviceId: string, signal?: AbortSignal) {
  await call(accountId, 'revoke_my_push_device', { p_device_id: deviceId }, signal);
}
/** Keep commandId after an uncertain result: read status or retry this exact
 * device/ID, never silently generate another test. No notification is sent here. */
export async function requestPushTest(accountId: string, deviceId: string, commandId: string, signal?: AbortSignal): Promise<PushTestReceipt> {
  const result = testReceipt.parse(await call(accountId, 'request_my_push_test', { p_device_id: deviceId, p_command_id: commandId }, signal));
  if (result.commandId !== commandId || result.deviceId !== deviceId) throw new Error('INVALID_PUSH_TEST_RESPONSE');
  return result;
}
export async function getPushTest(accountId: string, commandId: string, signal?: AbortSignal): Promise<PushTestStatus | null> {
  const result = testStatus.nullable().parse(await call(accountId, 'get_my_push_test', { p_command_id: commandId }, signal));
  if (result && result.commandId !== commandId) throw new Error('INVALID_PUSH_TEST_RESPONSE');
  return result;
}
function decodeReminder(value: unknown, accountId: string) {
  const result = reminder.nullable().parse(value);
  if (result && result.user_id !== accountId) throw new Error('INVALID_REMINDER_RESPONSE');
  return result;
}
export async function getWellnessReminder(accountId: string, signal?: AbortSignal) {
  return decodeReminder(await call(accountId, 'get_my_wellness_reminder', {}, signal), accountId);
}
export async function saveWellnessReminder(accountId: string, enabled: boolean, time: string, signal?: AbortSignal) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('INVALID_REMINDER_TIME');
  const result = decodeReminder(await call(accountId, 'save_my_wellness_reminder', {
    p_enabled: enabled, p_reminder_time: `${time}:00`,
  }, signal), accountId);
  if (!result || result.enabled !== enabled || result.reminder_time !== `${time}:00`) throw new Error('INVALID_REMINDER_RESPONSE');
  return result;
}
export function notificationError(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  const messages: Record<string, string> = {
    NOTIFICATION_ACCOUNT_CHANGED: 'The signed-in account changed. Reload these settings before continuing.',
    NOTIFICATION_REQUEST_TIMEOUT: 'The connection took too long. Reload the saved setting before trying again; its result has not been confirmed.',
    PUSH_DELIVERY_DISABLED: 'Push delivery is not enabled for this app yet.',
    PUSH_PREFERENCES_DISABLED: 'Enable notifications in your preferences before testing this device.',
    PUSH_DEVICE_NOT_ENABLED: 'Enable this device with the current push setup before testing it.',
    PUSH_TEST_RATE_LIMITED: 'Wait one minute before requesting another device test.',
    PUSH_TEST_COMMAND_REUSED: 'This test request belongs to another device. Check its saved result before starting a new test.',
    PUSH_KEY_CHANGED: 'Push setup changed. Reload notification settings, then enable this device again.',
    PUSH_DEVICE_REQUIRES_RESUBSCRIBE: 'This browser needs a new subscription. Disable browser push, then enable this device again.',
    INVALID_PUSH_SUBSCRIPTION: 'This browser could not provide a supported push subscription.',
    TIMEZONE_REQUIRED: 'Save your timezone in Profile before enabling a reminder.',
    INVALID_REMINDER_TIME: 'Choose a valid hour and minute for your reminder.',
  };
  return messages[code] ?? 'This notification setting could not be confirmed. Reload its saved state before trying again.';
}
