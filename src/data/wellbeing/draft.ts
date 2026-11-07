import { validateMetrics } from './api';
import { wellbeingScopeKey } from './scope';
import type { WellbeingDraft, WellbeingRequest, WellbeingScope } from './types';
import { requireUndeletedAccount } from '@/data/accountDeletion/tombstone';

export const draftKey = (scope: WellbeingScope) => `obedience:wellbeing:v1:${JSON.stringify(wellbeingScopeKey(scope))}`;
export function readWellbeingDraft(scope: WellbeingScope): WellbeingDraft | null {
  const text = localStorage.getItem(draftKey(scope)); if (!text) return null;
  const data = JSON.parse(text) as WellbeingDraft;
  if (data.version !== 1 || JSON.stringify(wellbeingScopeKey(data.scope)) !== JSON.stringify(wellbeingScopeKey(scope))) throw new Error('DRAFT_STORAGE_UNAVAILABLE');
  validateMetrics(data.metrics);
  if (data.pending) {
    const p = data.pending;
    if (JSON.stringify(wellbeingScopeKey(p.scope)) !== JSON.stringify(wellbeingScopeKey(scope)) || !/^[0-9a-f-]{36}$/i.test(p.commandId) || !Number.isFinite(Date.parse(p.clientReportedAt)) || !p.expectedTimezone) throw new Error('DRAFT_STORAGE_UNAVAILABLE');
    validateMetrics(p.metrics);
  }
  return data;
}
export function storeWellbeingDraft(draft: WellbeingDraft, expectedCommandId: string | null = null): void {
  requireUndeletedAccount(draft.scope.backendId, draft.scope.accountId);
  try {
    const current = readWellbeingDraft(draft.scope);
    if ((current?.pending?.commandId ?? null) !== expectedCommandId) throw new Error('DRAFT_CHANGED');
    localStorage.setItem(draftKey(draft.scope), JSON.stringify(draft));
  } catch (error) { if (error instanceof Error && error.message === 'DRAFT_CHANGED') throw error; throw new Error('DRAFT_STORAGE_UNAVAILABLE'); }
}
export function clearWellbeingDraft(scope: WellbeingScope, commandId: string | null) {
  const current = readWellbeingDraft(scope);
  if (!current) return; // Another tab may already have acknowledged this receipt.
  if ((current.pending?.commandId ?? null) !== commandId) throw new Error('DRAFT_CHANGED');
  localStorage.removeItem(draftKey(scope));
}
export function makeWellbeingRequest(scope: WellbeingScope, expectedTimezone: string, metrics: WellbeingDraft['metrics']): WellbeingRequest {
  return { scope: { ...scope }, expectedTimezone, metrics: validateMetrics(metrics), commandId: crypto.randomUUID(), clientReportedAt: new Date().toISOString() };
}

/** Earlier connection drafts are receipt-only: never adopt them into the current form. */
export function earlierWellbeingDrafts(scope: WellbeingScope): { drafts: WellbeingDraft[]; unreadable: boolean } {
  const drafts: WellbeingDraft[] = []; let unreadable = false;
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith('obedience:wellbeing:v1:') || key === draftKey(scope)) continue;
      let parts: unknown;
      try { parts = JSON.parse(key.slice('obedience:wellbeing:v1:'.length)); } catch { continue; }
      if (!Array.isArray(parts) || parts.length !== 4 || parts[0] !== scope.backendId || parts[1] !== scope.accountId || parts.some(part => typeof part !== 'string')) continue;
      try {
        const oldScope = { backendId: parts[0], accountId: parts[1], relationshipId: parts[2], relationshipSessionId: parts[3] };
        const draft = readWellbeingDraft(oldScope); if (draft?.pending) drafts.push(draft);
      } catch { unreadable = true; }
    }
  } catch { unreadable = true; }
  return { drafts, unreadable };
}
