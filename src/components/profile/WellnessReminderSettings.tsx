import React, { useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Clock, Bell, Calendar } from 'lucide-react';
import { TimePicker } from '@/components/ui/time-picker';
import { useWellnessReminders } from '@/hooks/useWellnessReminders';
import { toast } from '@/hooks/use-toast';

export default function WellnessReminderSettings() {
  const { accountId, reminder, isReady, isLoading, isSaving, error, saveReminder, reload, timezone } = useWellnessReminders();
  const [edited, setEdited] = useState<{ accountId: string; enabled: boolean; time: string } | null>(null);
  const currentAccount = useRef(accountId); currentAccount.current = accountId;
  const value = edited?.accountId === accountId ? edited : { accountId, enabled: reminder?.enabled ?? false, time: reminder?.reminder_time.slice(0, 5) ?? '09:00' };
  const hasChanges = value.enabled !== (reminder?.enabled ?? false) || value.time !== (reminder?.reminder_time.slice(0, 5) ?? '09:00');
  const change = (patch: { enabled?: boolean; time?: string }) => { if (accountId) { setEdited({ ...value, accountId, ...patch }); } };
  const save = async () => {
    if (!accountId) return;
    const expected = accountId; const enabled = value.enabled; const time = value.time;
    const success = await saveReminder(enabled, time);
    if (currentAccount.current !== expected) return;
    if (success) { setEdited(null); toast({ title: enabled ? `Wellness reminder set for ${time} daily` : 'Wellness reminder disabled' }); }
  };
  let nextReminder: string | null = null;
  if (!hasChanges && reminder?.enabled && reminder.next_due_at && timezone) {
    try { nextReminder = new Intl.DateTimeFormat(undefined, { timeZone: timezone, weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(reminder.next_due_at)); } catch { /* Do not invent a browser-timezone schedule. */ }
  }
  if (isLoading) return <div className="space-y-4" role="status" aria-label="Loading your saved reminder">
    <div className="h-6 bg-light-navy rounded animate-pulse" />
    <div className="h-20 bg-light-navy rounded animate-pulse" />
  </div>;
  const saveButton = hasChanges && <div className="flex justify-end"><Button onClick={() => void save()} disabled={!isReady || isSaving || !!error} className="bg-cyan-600 hover:bg-cyan-700 text-white">{isSaving ? 'Saving...' : 'Save Reminder'}</Button></div>;
  return <section className="space-y-6 border-t border-light-navy pt-8 mt-8" aria-label="Wellness reminders">
    <h2 className="text-xl font-semibold text-white flex items-center gap-2"><Clock className="w-5 h-5" />Wellness Check-in Reminders</h2>
    <div className="bg-navy p-4 rounded border border-light-navy space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2"><Bell className={`w-5 h-5 ${value.enabled ? 'text-cyan-500' : 'text-gray-400'}`} /><div><Label className="text-white font-medium">Daily Wellness Reminder</Label><p className="text-sm text-gray-400">Get reminded to update your wellness score</p></div></div>
        <Switch aria-label="Daily Wellness Reminder" checked={value.enabled} onCheckedChange={enabled => change({ enabled })} disabled={!isReady || isSaving} />
      </div>
      {value.enabled && <div className="pt-4 border-t border-light-navy space-y-4">
        <div>
          <Label className="text-gray-300 text-sm mb-2 block">Reminder Time</Label>
          <div className="flex items-center gap-4"><TimePicker value={value.time} onChange={time => change({ time })} disabled={!isReady || isSaving} /><div className="text-sm text-gray-400">{timezone?.replace(/_/g, ' ') ?? 'Save your timezone in Profile before enabling a reminder.'}</div></div>
        </div>
        {nextReminder && <div className="bg-light-navy/30 p-3 rounded border border-light-navy/50"><div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-cyan-500" /><span className="text-gray-300">Next reminder:</span><span className="text-white font-medium">{nextReminder}</span></div></div>}
        {saveButton}
      </div>}
      {!value.enabled && saveButton}
      {error && <div role="alert" className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded"><p className="text-red-300 text-sm">{error}</p><Button variant="outline" size="sm" disabled={isSaving || isLoading} onClick={() => void reload()}>Reload saved reminder</Button></div>}
      <div className="text-xs text-gray-500 mt-4 p-3 bg-light-navy/20 rounded"><p className="mb-1">💡 <strong>Personal Reminder:</strong> This notification will be sent to you only (not your partner)</p><p>⏰ <strong>Daily Schedule:</strong> Reminders are sent at your chosen time every day when enabled</p></div>
    </div>
  </section>;
}
