import { useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { Button } from '@/components/ui/button';
import type { ProfileRole } from '@/types/profile';

const name = (role: ProfileRole) => role === 'dom' ? 'Dom' : 'Sub';
export function RoleSelectionSection() {
  const { relationshipIdentity: identity, roleTransitions: transition } = useAuth();
  const [selection, setSelection] = useState<{ options: unknown; mode: 'fresh' | 'resume' | ''; period: string }>({ options: null, mode: '', period: '' });
  const options = transition?.options?.data;
  const mode = selection.options === options ? selection.mode : '';
  const period = selection.options === options ? selection.period : '';
  const selected = options?.saved.find(item => item.periodId === period);
  const locked = identity.status !== 'unlinked';
  const disabled = locked || !transition?.available || !transition.storageReady || transition.loading || transition.busy || !!transition.record;
  const show = (role: ProfileRole) => { if (!disabled) void transition.loadOptions(role); };
  return <section className="mb-8 space-y-3" aria-label="Role selection">
    <h2 className="text-sm font-medium text-gray-300">Current Role</h2>
    <p className="text-gray-400 bg-navy p-3 rounded border border-light-navy capitalize">{identity.currentRole || 'Not set'}</p>
    <div className="flex flex-wrap gap-2">
      {(['sub', 'dom'] as const).map(role => <Button key={role} onClick={() => show(role)} disabled={disabled || identity.currentRole === role}
        className={identity.currentRole === role ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 text-white hover:bg-gray-500 hover:text-white'}>
        Set as {role === 'dom' ? 'Dominant' : 'Submissive'}
      </Button>)}
      {identity.currentRole && <Button variant="ghost" disabled={disabled} onClick={() => show(identity.currentRole!)}>Saved solo progress</Button>}
    </div>
    {locked && <p className="text-sm text-gray-400">Disconnect your partner before changing your Dom or Sub role.</p>}
    {transition?.loading && <p role="status">Loading saved role changes…</p>}
    {transition?.busy && <p role="status">Checking your role change. Keep this saved request until its result is confirmed…</p>}
    {transition?.error && <p role="alert" className="text-amber-300">{transition.error}</p>}
    {transition && !transition.storageReady && !transition.loading && <Button variant="outline" disabled={transition.busy} onClick={() => void transition.reload()}>Reload saved changes</Button>}
    {transition?.record && <div className="rounded border border-light-navy bg-navy p-3 space-y-2">
      {transition.record.status === 'pending' ? <>
        <p>Saved request: {transition.record.intent.mode === 'resume' ? 'resume saved' : 'start fresh'} {name(transition.record.intent.role)} progress. Its result is not confirmed.</p>
        {!transition.canRetry && <p>Your connection changed. This saved request can only be checked, not sent in the new connection.</p>}
        <Button variant="outline" disabled={transition.busy} onClick={() => void transition.check()}>Check saved result</Button>
        {transition.canRetry && <Button variant="outline" disabled={transition.busy} onClick={() => void transition.retry()}>Retry same role change</Button>}
      </> : <>
        <p>{transition.record.status === 'rejected' ? 'This request was not applied. Review current choices before trying again.' : transition.receiptIsCurrent
          ? `${name(transition.record.receipt!.to.role)} progress is now active. Your previous progress remains saved.`
          : 'This earlier role change was completed. Your current connection is different or still needs verification.'}</p>
        <Button variant="outline" disabled={transition.busy} onClick={() => void transition.dismiss()}>{transition.record.status === 'rejected' ? 'Review choices again' : 'Done'}</Button>
      </>}
    </div>}
    {transition?.options && <div role="group" aria-label="Review solo role progress" className="rounded border border-light-navy bg-navy p-4 space-y-3">
      {transition.options.loading && <p role="status">Loading {name(transition.options.target)} progress choices…</p>}
      {transition.options.error && <div role="alert"><p>{transition.options.error}</p><Button variant="outline" onClick={() => void transition.refreshAccount()}>Refresh account</Button></div>}
      {options && <>
        <p>Current {name(options.current.role)} progress: {options.current.balance} points · {options.current.availableUses} unused reward uses.</p>
        <p className="text-sm text-gray-300">Your current progress will stay saved. Points, owned rewards and history are kept in their original role and period; nothing is converted, refunded or moved.</p>
        <label className="block text-sm">{name(options.role)} progress choice
          <select className="mt-1 w-full bg-dark-navy border border-light-navy rounded p-2" value={mode} disabled={transition.busy}
            onChange={event => setSelection({ options, mode: event.target.value as 'fresh' | 'resume' | '', period: '' })}>
            <option value="">Choose how to continue</option>
            <option value="resume" disabled={!options.saved.length}>Resume saved solo progress</option>
            {options.role !== options.current.role && <option value="fresh">Start this role fresh</option>}
          </select>
        </label>
        {!options.saved.length && <p>No saved solo progress is available for this role.</p>}
        {mode === 'resume' && <label className="block text-sm">Saved {name(options.role)} period
          <select className="mt-1 w-full bg-dark-navy border border-light-navy rounded p-2" value={period} disabled={transition.busy}
            onChange={event => setSelection({ options, mode, period: event.target.value })}>
            <option value="">Choose a saved period</option>
            {options.saved.map((item, index) => <option key={item.periodId} value={item.periodId}>Period {index + 1} · {item.startedAt.slice(0, 10)}{item.endedAt ? ` to ${item.endedAt.slice(0, 10)}` : ''} · {item.balance} points · {item.availableUses} unused uses</option>)}
          </select>
        </label>}
        {mode === 'fresh' && <p>Selected {name(options.role)} progress: 0 points · 0 unused reward uses. This starts a new empty period.</p>}
        {mode === 'resume' && selected && <p>Selected {name(selected.role)} progress: {selected.balance} points · {selected.availableUses} unused reward uses. Its saved history and definitions will become current.</p>}
        <Button className="bg-cyan-600 hover:bg-cyan-700" disabled={transition.busy || !(mode === 'fresh' || mode === 'resume' && selected)}
          onClick={() => { if (mode) void transition.confirm(mode, mode === 'resume' ? period : null); }}>Confirm {mode === 'resume' ? 'resume' : 'role change'}</Button>
      </>}
      <Button variant="ghost" disabled={transition.busy} onClick={transition.cancelReview}>Cancel</Button>
    </div>}
  </section>;
}
