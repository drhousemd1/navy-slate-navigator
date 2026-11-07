import { useCallback, useEffect, useRef, useState } from 'react';
import { getPushTest, notificationError, requestPushTest, type PushTestStatus } from '@/data/notifications/api';
import { readPushDeviceId } from '@/lib/pushDevice';
import { isPushTestTerminal, readPushTestIntent, savePushTestIntent, type PushTestIntent } from '@/lib/pushDeviceTest';

interface View { accountId: string | null; generation: number; intent: PushTestIntent | null; status: PushTestStatus['status'] | null; accepted: boolean; pending: boolean; error: string | null }
const empty = (accountId: string | null, generation: number): View => ({ accountId, generation, intent: null, status: null, accepted: false, pending: false, error: null });
export function usePushDeviceTest(accountId: string | null) {
  const current = useRef({ accountId, generation: 0 });
  const pending = useRef<AbortController | null>(null);
  if (current.current.accountId !== accountId) {
    pending.current?.abort(); pending.current = null;
    current.current = { accountId, generation: current.current.generation + 1 };
  }
  const scope = current.current;
  const [state, setState] = useState<View>(() => empty(accountId, scope.generation));
  const view = state.accountId === accountId && state.generation === scope.generation ? state : empty(accountId, scope.generation);
  const active = () => current.current === scope;
  const check = useCallback(async (intent: PushTestIntent) => {
    if (!accountId || pending.current) return;
    const controller = new AbortController(); pending.current = controller;
    const valid = () => current.current === scope && !controller.signal.aborted;
    setState(previous => ({ ...(previous.accountId === accountId && previous.generation === scope.generation ? previous : empty(accountId, scope.generation)), intent, pending: true, error: null }));
    try {
      const result = await getPushTest(accountId, intent.commandId, controller.signal);
      if (result && result.deviceId !== intent.deviceId) throw new Error('INVALID_PUSH_TEST_RESPONSE');
      if (valid()) setState({ ...empty(accountId, scope.generation), intent, status: result?.status ?? null, accepted: !!result });
    } catch (error) { if (valid()) setState(previous => ({ ...previous, pending: false, error: notificationError(error) })); }
    finally { if (pending.current === controller) pending.current = null; }
  }, [accountId, scope]);
  useEffect(() => {
    if (accountId) {
      try { const id = readPushDeviceId(); const intent = id ? readPushTestIntent(accountId, id) : null; if (intent) void check(intent); }
      catch { setState({ ...empty(accountId, scope.generation), error: 'The saved test request could not be read. It has not been replaced.' }); }
    }
    return () => { pending.current?.abort(); pending.current = null; };
  }, [accountId, check, scope]);

  const request = async (retry: boolean) => {
    if (!accountId || pending.current || !active()) return;
    if (!retry && view.intent && !isPushTestTerminal(view.status)) return;
    let intent: PushTestIntent;
    try {
      const deviceId = readPushDeviceId(); if (!deviceId) throw new Error('PUSH_DEVICE_NOT_ENABLED');
      if (retry) {
        if (!view.intent || view.intent.deviceId !== deviceId) throw new Error('PUSH_TEST_COMMAND_REUSED');
        intent = view.intent;
      } else {
        const saved = readPushTestIntent(accountId, deviceId);
        if (saved && saved.commandId !== view.intent?.commandId) { void check(saved); return; }
        intent = { deviceId, commandId: crypto.randomUUID() };
        // Save before sending, so an uncertain result survives a reload.
        savePushTestIntent(accountId, intent);
      }
    } catch (error) { if (active()) setState(previous => ({ ...previous, error: notificationError(error) })); return; }
    const controller = new AbortController(); pending.current = controller;
    const valid = () => current.current === scope && !controller.signal.aborted;
    setState({ ...empty(accountId, scope.generation), intent, pending: true });
    try {
      await requestPushTest(accountId, intent.deviceId, intent.commandId, controller.signal);
      if (!valid()) return;
      setState(previous => ({ ...previous, accepted: true }));
      const result = await getPushTest(accountId, intent.commandId, controller.signal);
      if (result && result.deviceId !== intent.deviceId) throw new Error('INVALID_PUSH_TEST_RESPONSE');
      if (valid()) setState({ ...empty(accountId, scope.generation), intent, status: result?.status ?? null, accepted: true });
    } catch (error) { if (valid()) setState(previous => ({ ...previous, pending: false, error: notificationError(error) })); }
    finally { if (pending.current === controller) pending.current = null; }
  };
  return { ...view, canStartNew: !view.pending && !view.error && (!view.intent || isPushTestTerminal(view.status)),
    requestNew: () => request(false), retrySame: () => request(true), check: () => view.intent ? check(view.intent) : Promise.resolve(),
  };
}
