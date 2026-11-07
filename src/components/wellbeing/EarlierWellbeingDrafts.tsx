import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { readWellbeingReceipt, wellbeingError } from '@/data/wellbeing/api';
import { checkinTime } from '@/data/wellbeing/calendar';
import { clearWellbeingDraft, earlierWellbeingDrafts } from '@/data/wellbeing/draft';
import type { WellbeingDraft, WellbeingScope, WellbeingSnapshot } from '@/data/wellbeing/types';

/** This component is keyed by the current account/period/session, like the form. */
export default function EarlierWellbeingDrafts({ scope }: { scope: WellbeingScope }) {
  const [saved, setSaved] = useState(() => earlierWellbeingDrafts(scope));
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ commandId: string; message?: string; receipt?: WellbeingSnapshot } | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const check = async (draft: WellbeingDraft) => {
    if (!draft.pending || request.current) return;
    const pending = draft.pending, controller = new AbortController(); request.current = controller;
    setBusy(pending.commandId); setResult(null);
    try {
      const receipt = await readWellbeingReceipt(pending, controller.signal);
      if (!controller.signal.aborted) setResult(receipt ? { commandId: pending.commandId, receipt } : {
        commandId: pending.commandId, message: 'No confirmed result was found. This report remains saved on this device and cannot be sent in your current connection.',
      });
    } catch (error) { if (!controller.signal.aborted) setResult({ commandId: pending.commandId, message: 'The original result could not be checked. This report remains saved on this device and will not be sent in the current connection. Try checking again.' }); }
    finally { if (!controller.signal.aborted) { request.current = null; setBusy(null); } }
  };
  const acknowledge = (draft: WellbeingDraft) => {
    try { clearWellbeingDraft(draft.scope, draft.pending!.commandId); setSaved(earlierWellbeingDrafts(scope)); setResult(null); }
    catch (error) { setResult({ commandId: draft.pending!.commandId, message: wellbeingError(error) }); }
  };
  if (!saved.drafts.length && !saved.unreadable) return null;
  return <section className="rounded-lg bg-navy border border-light-navy p-4 text-white space-y-3" aria-label="Earlier pending wellbeing reports">
    <h2 className="font-semibold">Earlier pending reports</h2>
    <p className="text-sm text-gray-400">These belong to an earlier relationship connection. You can check their original results; they will never be sent or moved into this connection.</p>
    {saved.unreadable && <p role="alert">An earlier saved report could not be read. It has been left intact on this device.</p>}
    {saved.drafts.map(draft => <div key={draft.pending!.commandId} className="border-t border-light-navy pt-3 space-y-2">
      <p className="text-sm">Save chosen at {new Date(draft.pending!.clientReportedAt).toLocaleString()} (device-reported time) · {draft.pending!.expectedTimezone}</p>
      <Button disabled={busy !== null} variant="outline" onClick={() => void check(draft)}>{busy === draft.pending!.commandId ? 'Checking…' : 'Check original result'}</Button>
      {result?.commandId === draft.pending!.commandId && <div role="status" className="text-sm text-gray-300">{result.message || <>
        <p>Original check-in confirmed. {checkinTime(result.receipt!)} · {result.receipt!.overallScore}/100. It still belongs to its original relationship connection.</p>
        <Button variant="outline" onClick={() => acknowledge(draft)}>Dismiss recovered report</Button>
      </>}</div>}
    </div>)}
  </section>;
}
