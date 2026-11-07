import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { readWellbeingReceipt, saveWellbeingCheckin, wellbeingError } from './api';
import { clearWellbeingDraft, draftKey, makeWellbeingRequest, readWellbeingDraft, storeWellbeingDraft } from './draft';
import { DEFAULT_METRICS, type WellbeingDraft, type WellbeingMetrics, type WellbeingScope, type WellbeingSnapshot } from './types';

/** Mount with the exact scope key: a new connection must never adopt this draft. */
export function useWellbeingDraft(scope: WellbeingScope, timezone: string | null, latest: WellbeingSnapshot | null) {
  const client = useQueryClient();
  const [initial] = useState(() => {
    try { return { draft: readWellbeingDraft(scope), error: null }; }
    catch { return { draft: null, error: 'Your saved wellbeing draft could not be read. Nothing will be sent until it can be recovered.' }; }
  });
  const [draft, setDraft] = useState<WellbeingDraft>(initial.draft ?? { version: 1, scope, metrics: { ...DEFAULT_METRICS, ...latest?.metrics }, pending: null });
  const [error, setError] = useState<string | null>(initial.error);
  const [storageBlocked, setStorageBlocked] = useState(!!initial.error);
  const [saving, setSaving] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [confirmation, setConfirmation] = useState<WellbeingSnapshot | null>(null);
  const active = useRef(true); const busy = useRef(false);
  const currentTimezone = useRef(timezone); currentTimezone.current = timezone;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    const listener = (event: StorageEvent) => {
      if (event.key !== draftKey(scope)) return;
      try { const value = readWellbeingDraft(scope); if (value) setDraft(value); setCanReview(false); }
      catch { setStorageBlocked(true); setError('Your saved draft changed and could not be read. Reload before continuing.'); }
    };
    window.addEventListener('storage', listener); return () => window.removeEventListener('storage', listener);
  }, [scope]);
  const change = (metrics: WellbeingMetrics) => {
    if (draft.pending || busy.current || storageBlocked) return;
    const next = { ...draft, metrics }; setDraft(next); setConfirmation(null);
    try { storeWellbeingDraft(next); setError(null); } catch (e) { setError(wellbeingError(e)); }
  };
  const confirmed = async (row: WellbeingSnapshot, commandId: string) => {
    clearWellbeingDraft(scope, commandId);
    if (!active.current) return;
    setDraft({ version: 1, scope, metrics: { ...DEFAULT_METRICS, ...row.metrics }, pending: null });
    setConfirmation(row); setError(null); setCanReview(false);
    await client.invalidateQueries({ predicate: query => String(query.queryKey[0]).startsWith('wellbeing-') });
  };
  const save = async () => {
    if (busy.current || storageBlocked) return;
    if (!timezone) { setError(wellbeingError(new Error('TIMEZONE_REQUIRED'))); return; }
    busy.current = true; setSaving(true); setError(null); setCanReview(false);
    try {
      // Read the persisted state again so another tab's pending report cannot be
      // replaced by this tab's older form. Storage failure prevents transmission.
      const stored = readWellbeingDraft(scope);
      const request = stored?.pending ?? draft.pending ?? makeWellbeingRequest(scope, timezone, draft.metrics);
      const pending = { ...draft, metrics: request.metrics, pending: request };
      storeWellbeingDraft(pending, stored?.pending?.commandId ?? null);
      if (!active.current) return;
      setDraft(pending);
      const receipt = await readWellbeingReceipt(request);
      if (!active.current) return;
      if (receipt) { await confirmed(receipt, request.commandId); return; }
      if (request.expectedTimezone !== currentTimezone.current) {
        setCanReview(true); throw new Error('WELLBEING_TIMEZONE_CHANGED');
      }
      try { const result = await saveWellbeingCheckin(request); if (active.current) await confirmed(result, request.commandId); }
      catch (e) { if (active.current && e instanceof Error && e.message === 'WELLBEING_TIMEZONE_CHANGED') setCanReview(true); throw e; }
    } catch (e) { if (active.current) setError(wellbeingError(e)); }
    finally { busy.current = false; if (active.current) setSaving(false); }
  };
  const review = () => {
    if (!canReview || busy.current || !draft.pending) return;
    // Only a confirmed timezone rejection permits a fresh request. Unknown
    // results remain pending and cannot be discarded by this control.
    try { storeWellbeingDraft({ ...draft, pending: null }, draft.pending.commandId); setDraft({ ...draft, pending: null }); setCanReview(false); setError(null); }
    catch (e) { setError(wellbeingError(e)); }
  };
  const recoverStorage = () => {
    try { const value = readWellbeingDraft(scope); if (value) setDraft(value); setStorageBlocked(false); setError(null); }
    catch { setError('The saved draft is still unavailable. Keep it intact and retry later.'); }
  };
  return { draft, change, save, saving, error, confirmation, canReview, review, storageBlocked, recoverStorage };
}
