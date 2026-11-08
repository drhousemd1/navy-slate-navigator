import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { messageDraftRepository, type MessageDraft } from '@/data/messages/drafts';
import { messageTransport } from '@/data/messages/transport';
import { messageScopeKey, type MessageScope } from '@/data/messages/types';

export default function EarlierMessageDrafts({ scope }: { scope: MessageScope }) {
  const key = messageScopeKey(scope);
  const [rows, setRows] = useState<MessageDraft[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const active = React.useRef(key); active.current = key;
  useEffect(() => {
    let cancelled = false; setRows([]); setNotice(null); setBusy(null);
    void messageDraftRepository().list(scope.accountId, scope.backendId).then(saved => {
      if (!cancelled) setRows(saved.filter(row => messageScopeKey(row.scope) !== key));
    }, () => { if (!cancelled) setNotice('Earlier saved drafts could not be checked on this device.'); });
    return () => { cancelled = true; };
  }, [scope, key]);
  const check = async (row: MessageDraft) => {
    setBusy(row.key); setNotice(null);
    try {
      const receipt = await messageTransport.receipt(scope.accountId, row.commandId);
      if (active.current !== key) return;
      if (!receipt) { setNotice('No confirmed receipt was found. The earlier draft is retained and will not be sent to this connection.'); return; }
      if (receipt.conversationId !== row.conversationId) throw new Error('Invalid receipt');
      await messageDraftRepository().remove(row.key);
      if (active.current === key) { setRows(current => current.filter(item => item.key !== row.key)); setNotice('The earlier message was delivered. Its saved draft has been cleared.'); }
    } catch { if (active.current === key) setNotice('The earlier delivery could not be checked. Its saved draft is retained.'); }
    finally { if (active.current === key) setBusy(null); }
  };
  if (!rows.length && !notice) return null;
  return <details className={`px-4 py-2 border-b border-light-navy text-sm text-gray-300`}><summary>Saved drafts from earlier connections ({rows.length})</summary>
    {notice && <p role="status" className="py-2">{notice}</p>}
    {rows.map(row => <div key={row.key} className="py-2 space-y-1"><p>{row.status === 'editing' ? 'Unsent draft' : 'Earlier message request'} · {new Date(row.updatedAt).toLocaleString()}</p>
      <p className="whitespace-pre-wrap break-words">{row.text || (row.image ? 'Saved image draft' : 'Empty draft')}</p>
      {row.image && <p>Image retained on this device.</p>}
      <p>This draft will not be submitted to the current connection.</p>
      {row.status !== 'editing' && <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void check(row)}>Check earlier delivery</Button>}
    </div>)}
  </details>;
}
