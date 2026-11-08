import { useEffect, useState } from 'react';
import { IndexedDBActionQueueStore } from '@/data/actions/store';
import { readRecoverySnapshot, recoveryCommands } from '@/lib/offline/recovery';
import { actionLabels, savedActionStatus } from '@/lib/offline/action-status';
import { Button } from '@/components/ui/button';

export function OfflineRecovery({ backendId, accountId, checking, onRetry, onSignOut }: {
  backendId: string; accountId: string; checking: boolean; onRetry(): void; onSignOut(): void;
}) {
  const [saved, setSaved] = useState<{ account: string; backend: string; rows: ReturnType<typeof recoveryCommands>; error: boolean } | null>(null);
  const snapshot = readRecoverySnapshot(backendId, accountId);
  useEffect(() => {
    let active = true;
    const store = new IndexedDBActionQueueStore();
    const load = async () => {
      try {
        const rows = recoveryCommands(await store.list(), backendId, accountId);
        if (active) setSaved({ account: accountId, backend: backendId, rows, error: false });
      } catch { if (active) setSaved({ account: accountId, backend: backendId, rows: [], error: true }); }
    };
    void load();
    const interval = setInterval(() => void load(), 10_000);
    return () => { active = false; clearInterval(interval); void store.close().catch(() => {}); };
  }, [accountId, backendId]);
  const visible = saved?.account === accountId && saved.backend === backendId ? saved : null;
  return <main className="h-full overflow-y-auto bg-background p-4 text-foreground">
    <section className="mx-auto w-full max-w-md p-6 space-y-6 bg-card rounded-lg shadow-lg border border-border" aria-labelledby="recovery-heading">
      <h1 id="recovery-heading" className="text-2xl font-bold text-center text-foreground">Connection unavailable</h1>
      <p role="status">Your account connection could not be verified. Saved information is read-only until you reconnect.</p>
      {snapshot ? <div className="space-y-2 border-t border-light-navy pt-4">
        <h2 className="font-semibold">Your last confirmed totals</h2>
        <p className="text-sm text-gray-300">Saved {new Date(snapshot.savedAt).toLocaleString()}. These totals may have changed. Pending actions are not included.</p>
        {snapshot.wallets.length ? snapshot.wallets.map(wallet => <p key={wallet.currency}>Your {wallet.currency === 'sub' ? 'Sub' : 'Dom'} points: <strong>{wallet.balance}</strong></p>) : <p>No confirmed balance was saved.</p>}
        {snapshot.availableRewards.map(item => <p key={item.currency}>Your available {item.currency === 'sub' ? 'Sub' : 'Dom'} rewards: {item.quantity}</p>)}
      </div> : <p>No confirmed totals are saved for this account on this device.</p>}
      <div className="space-y-2 border-t border-light-navy pt-4">
        <h2 className="font-semibold">Saved actions</h2>
        {!visible ? <p>Reading saved actions…</p> : visible.error ? <p role="alert">Saved actions could not be read. Their records have not been deleted. Do not clear site data.</p> : visible.rows.length ? <ul className="space-y-3">
          {visible.rows.map(row => <li key={row.id}><strong>{actionLabels[row.kind] ?? 'Action'}</strong> — {savedActionStatus(row.status, true)}</li>)}
        </ul> : <p>No unconfirmed actions were found for this account on this device.</p>}
        <p className="text-sm text-gray-300">Saved actions can resume after your connection is verified. Earlier connections’ actions remain available to check.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button disabled={checking} onClick={onRetry}>{checking ? 'Checking connection…' : 'Retry connection'}</Button>
        <Button variant="outline" onClick={onSignOut}>Sign out</Button>
      </div>
      <p className="text-xs text-gray-300">Keep this device’s site data to retain unconfirmed actions. Signing out removes this recovery summary; it does not delete the saved-action records.</p>
    </section>
  </main>;
}
