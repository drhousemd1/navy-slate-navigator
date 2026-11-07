import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { AccountDeletion } from '@/contexts/auth/useAccountDeletion';
import type { DeletionRecord } from '@/data/accountDeletion/types';

export function AccountDeletionProgress({ deletion, record }: { deletion: AccountDeletion; record: DeletionRecord }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1_000); return () => clearInterval(timer); }, []);
  const wait = Math.max(0, Math.ceil((record.nextCheckAt - now) / 1_000));
  const busy = deletion.busyJob !== null; const disabled = busy || wait > 0;
  const complete = record.status?.state === 'complete';
  const description = record.cleanupComplete ? 'The server confirmed your account was deleted, and this device’s data that could be verified as belonging to that account has been removed.'
    : complete ? 'The server confirmed your account was deleted. Device cleanup still needs to finish.'
      : record.status?.state === 'retry_required' ? 'Deletion is unfinished. Continue this saved request to retry the remaining work.'
        : record.status ? `Deletion is unfinished. ${record.status.phase === 'storage' ? 'Stored-file cleanup remains.' : 'Account removal remains.'} Check its status or continue the same saved request.`
          : record.startRejected ? 'Deletion did not start. You can retry this saved request when available, or return to your account to review it again.'
            : record.attempted ? 'The deletion result is unknown. Check this saved request before doing anything else. Signing out is not confirmation of deletion.'
              : 'Recovery information was saved on this device, but no deletion result has been confirmed.';
  return <section aria-label="Account deletion" className="mx-auto my-8 w-full max-w-lg rounded-lg border border-light-navy bg-navy p-6 text-white space-y-4">
    <h1 className="text-xl font-semibold">{complete ? 'Account deleted' : 'Account deletion'}</h1>
    <p role="status" className="text-sm text-gray-300">{description}</p>
    <p className="text-sm text-gray-400">Shared messages, photos and recorded history may remain with the other person. Your profile is shown as “Deleted account”; text you wrote is not automatically anonymized.</p>
    {record.cleanupComplete && record.legacyPreserved && <p className="text-sm text-amber-200">Some older device caches or drafts have no reliable account and backend label. They were preserved so another account’s data would not be erased. This does not mean the server deletion failed, and we cannot claim that all device data was erased.</p>}
    {!record.cleanupComplete && <p className="text-xs text-gray-400">Keep this browser’s site data until completion. Recovery is saved on this device; clearing site data removes that recovery access. Nothing is scheduled to run automatically.</p>}
    {deletion.errors[record.jobId] && <p role="alert" className="text-sm text-red-300">{deletion.errors[record.jobId]}</p>}
    {wait > 0 && !complete && <p className="text-sm text-gray-400">Try again in {wait} seconds.</p>}
    {busy && <p className="text-sm text-gray-400">Checking or updating this saved request…</p>}
    <div className="flex flex-wrap gap-2">
      {record.cleanupComplete ? <Button variant="outline" onClick={() => void deletion.dismiss(record)}>Dismiss confirmation</Button>
        : complete ? <Button disabled={busy} onClick={() => void deletion.run(record, 'cleanup')}>Retry device cleanup</Button>
          : <>
            <Button variant="outline" disabled={disabled} onClick={() => void deletion.run(record, 'status')}>Check deletion status</Button>
            {record.status && <Button disabled={disabled} onClick={() => void deletion.run(record, 'resume')}>Continue deletion</Button>}
            {!record.status && deletion.canRetryStart(record) && <Button variant="destructive" disabled={disabled} onClick={() => void deletion.run(record, 'start')}>Retry same deletion request</Button>}
            {(!record.attempted || record.startRejected) && <Button variant="outline" disabled={busy} onClick={() => void deletion.dismiss(record)}>Return to account</Button>}
          </>}
    </div>
  </section>;
}
