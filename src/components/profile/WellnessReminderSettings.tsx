import React, { useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Clock, Bell, Calendar } from 'lucide-react';
import { TimePicker } from '@/components/ui/time-picker';
import { useWellnessReminders } from '@/hooks/useWellnessReminders';

export default function WellnessReminderSettings() {
  const { accountId, reminder, isReady, isLoading, isSaving, error, saveReminder, reload, timezone } = useWellnessReminders();
  const [edited, setEdited] = useState<{ accountId: string; enabled: boolean; time: string } | null>(null);
  const [notice, setNotice] = useState<{ accountId: string; message: string } | null>(null);
  const currentAccount = useRef(accountId); currentAccount.current = accountId;
  const value = edited?.accountId === accountId ? edited : { accountId, enabled: reminder?.enabled ?? false, time: reminder?.reminder_time.slice(0, 5) ?? '09:00' };
  const hasChanges = value.enabled !== (reminder?.enabled ?? false) || value.time !== (reminder?.reminder_time.slice(0, 5) ?? '09:00');
  const change = (patch: { enabled?: boolean; time?: string }) => { if (accountId) { setEdited({ ...value, accountId, ...patch }); setNotice(null); } };
  const save = async () => {
    if (!accountId) return;
    const expected = accountId; const enabled = value.enabled; const time = value.time;
    const success = await saveReminder(enabled, time);
    if (currentAccount.current !== expected) return;
    if (success) { setEdited(null); setNotice({ accountId: expected, message: enabled ? `Reminder schedule saved for ${time}.` : 'Wellness reminder disabled.' }); }
  };
  let nextReminder: string | null = null;
  if (!hasChanges && reminder?.enabled && reminder.next_due_at && timezone) {
    try { nextReminder = new Intl.DateTimeFormat(undefined, { timeZone: timezone, weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(reminder.next_due_at)); } catch { /* Do not invent a browser-timezone schedule. */ }
  }
  return <section className="space-y-6 border-t border-light-navy pt-8 mt-8" aria-label="Wellness reminders">
    <h2 className="text-xl font-semibold text-white flex items-center gap-2"><Clock className="w-5 h-5" />Wellness Check-in Reminders</h2>
    <div className="bg-navy p-4 rounded border border-light-navy space-y-4">
      {isLoading && <p role="status" className="text-sm text-gray-300">Loading your saved reminder…</p>}
      {error && <div role="alert" className="p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm"><p>{error}</p><Button variant="outline" size="sm" disabled={isSaving || isLoading} onClick={() => void reload()}>Reload saved reminder</Button></div>}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2"><Bell className={`w-5 h-5 ${value.enabled ? 'text-cyan-500' : 'text-gray-400'}`} /><div><Label className="text-white font-medium">Daily Wellness Reminder</Label><p className="text-gray-400 text-sm">Get reminded to update your wellness score</p></div></div>
        <Switch aria-label="Daily Wellness Reminder" checked={value.enabled} onCheckedChange={enabled => change({ enabled })} disabled={!isReady || isSaving} />
      </div>
      {value.enabled && <div className="pt-4 border-t border-light-navy space-y-4">
        <Label className="text-gray-300 text-sm mb-2 block">Reminder Time</Label>
        <div className="flex items-center gap-4"><TimePicker value={value.time} onChange={time => change({ time })} disabled={!isReady || isSaving} /><div className="text-sm text-gray-400">{timezone?.replace(/_/g, ' ') ?? 'Save your timezone in Profile before enabling a reminder.'}</div></div>
        {nextReminder && <div className="bg-light-navy/30 p-3 rounded border border-light-navy/50 flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-cyan-500" /><span className="text-gray-300">Next scheduled reminder:</span><span className="text-white font-medium">{nextReminder}</span></div>}
      </div>}
      {/* The save control stays reachable when switching an existing reminder off. */}
      {hasChanges && <div className="flex justify-end"><Button onClick={() => void save()} disabled={!isReady || isSaving || !!error} className="bg-cyan-600 hover:bg-cyan-700 text-white">{isSaving ? 'Saving…' : 'Save Reminder'}</Button></div>}
      {notice?.accountId === accountId && <p role="status" className="text-sm text-cyan-200">{notice.message}</p>}
      <div className="text-xs text-gray-500 mt-4 p-3 bg-light-navy/20 rounded"><p className="mb-1">This personal reminder is for you only. The schedule uses your saved Profile timezone.</p><p>Delivery depends on your notification preferences and an enabled device. Saving a schedule does not confirm delivery.</p></div>
    </div>
  </section>;
}
