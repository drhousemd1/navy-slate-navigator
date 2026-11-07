import { supabaseBackendId } from '@/integrations/supabase/client';
import { revokePushDevice } from '@/data/notifications/api';

const deviceStorageKey = `obedience:push-device:v1:${supabaseBackendId}`;
const bindingStorageKey = `${deviceStorageKey}:binding`;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export interface PushDeviceBinding { accountId: string; subscriptionId: string; fingerprint: string; keyId: string }

export function readPushDeviceId(): string | null {
  const saved = localStorage.getItem(deviceStorageKey);
  if (saved && !uuid.test(saved)) throw new Error('DEVICE_STORAGE_INVALID');
  return saved;
}
export function getOrCreatePushDeviceId(): string {
  const saved = readPushDeviceId();
  if (saved) return saved;
  const id = crypto.randomUUID(); localStorage.setItem(deviceStorageKey, id); return id;
}
export function readPushDeviceBinding(): PushDeviceBinding | null {
  try {
    const saved = localStorage.getItem(bindingStorageKey); const value = saved ? JSON.parse(saved) : null;
    return value && typeof value.accountId === 'string' && typeof value.subscriptionId === 'string'
      && typeof value.fingerprint === 'string' && typeof value.keyId === 'string' ? value : null;
  } catch { return null; }
}
export function writePushDeviceBinding(value: PushDeviceBinding): void {
  localStorage.setItem(bindingStorageKey, JSON.stringify(value));
}
export function clearPushDeviceBinding(accountId: string, deviceId: string, binding: PushDeviceBinding | null): void {
  // A late revoke must not erase another account's newly registered binding.
  if (readPushDeviceId() === deviceId && binding?.accountId === accountId
      && JSON.stringify(readPushDeviceBinding()) === JSON.stringify(binding)) localStorage.removeItem(bindingStorageKey);
}

export type LogoutPushResult = 'revoked' | 'not_registered' | 'unconfirmed';
/** Best effort before sign-out. Never creates a device, prompts, subscribes, or
 * touches another device. The caller must continue sign-out for every result. */
export async function revokeCurrentPushDeviceBeforeSignOut(accountId: string | null): Promise<LogoutPushResult> {
  if (!accountId) return 'not_registered';
  const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const deviceId = readPushDeviceId();
    if (!deviceId) return 'not_registered';
    const binding = readPushDeviceBinding();
    await Promise.race([revokePushDevice(accountId, deviceId, controller.signal), new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error('LOGOUT_PUSH_UNCONFIRMED')); }, 5000);
    })]);
    clearPushDeviceBinding(accountId, deviceId, binding);
    return 'revoked';
  } catch { return 'unconfirmed'; }
  finally { clearTimeout(timer); controller.abort(); }
}
