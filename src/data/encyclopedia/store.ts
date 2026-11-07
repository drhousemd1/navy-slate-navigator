import { z } from 'zod';
import type { EncyclopediaPatch, EncyclopediaScope, EncyclopediaIntent, EncyclopediaReceipt } from '@/types/encyclopedia';
import { requireUndeletedAccount } from '@/data/accountDeletion/tombstone';
import { EDITOR_DRAFT_PREFIX } from '@/lib/editorDrafts';
import { EncyclopediaError } from './errors';
import { decodeReceipt, intentSchema, draftPatchSchema } from './schema';

export interface EncyclopediaDraft {
  version: 1; storageRevision: number; scope: EncyclopediaScope; draftId: string; entryId: string; expectedRevision: number; patch: EncyclopediaPatch;
  intent: EncyclopediaIntent | null; receipt: EncyclopediaReceipt | null; rejected: boolean; rejectionCode: string | null;
}
const draftSchema = z.object({ version: z.literal(1), storageRevision: z.number().int().nonnegative().safe(), scope: z.object({ backendId: z.string().url(), accountId: z.string().min(1) }).strict(),
  draftId: z.string().uuid(), entryId: z.string().uuid(), expectedRevision: z.number().int().nonnegative().safe(), patch: draftPatchSchema,
  intent: intentSchema.nullable(), receipt: z.unknown().nullable(), rejected: z.boolean(), rejectionCode: z.string().nullable(),
}).strict();
const key = (scope: EncyclopediaScope) => `${EDITOR_DRAFT_PREFIX}${JSON.stringify([scope.backendId, scope.accountId, 'encyclopedia', 'global-v1', 'editor'])}`;
// Validation can reorder object fields. Compare JSON values, not insertion order;
// array ordering, explicit null/false/zero, and every actual field remain significant.
const comparableJSON = (value: unknown) => JSON.stringify(value, (_key, item) =>
  item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
export function readEncyclopediaDraft(scope: EncyclopediaScope, storage: Storage = localStorage): EncyclopediaDraft | null {
  try {
    const raw = storage.getItem(key(scope)); if (raw === null) return null;
    const parsed = draftSchema.parse(JSON.parse(raw));
    if (parsed.scope.backendId !== scope.backendId || parsed.scope.accountId !== scope.accountId) throw new Error();
    if (parsed.intent && (parsed.intent.entryId !== parsed.entryId || parsed.intent.expectedRevision !== parsed.expectedRevision ||
      parsed.intent.kind === 'save' && comparableJSON(parsed.intent.patch) !== comparableJSON(parsed.patch))) throw new Error();
    if (parsed.receipt && !parsed.intent) throw new Error();
    return { ...parsed, receipt: parsed.receipt ? decodeReceipt(parsed.receipt, parsed.intent! as EncyclopediaIntent) : null } as EncyclopediaDraft;
  } catch { throw new EncyclopediaError('DEVICE_STORAGE_UNAVAILABLE'); }
}
export function saveEncyclopediaDraft(draft: EncyclopediaDraft, expectedDraftId: string | null, storage: Storage = localStorage): void {
  requireUndeletedAccount(draft.scope.backendId, draft.scope.accountId);
  const current = readEncyclopediaDraft(draft.scope, storage);
  if (current && current.draftId !== expectedDraftId || !current && draft.storageRevision !== 0) throw new EncyclopediaError('DEVICE_STORAGE_CHANGED');
  if (current && current.storageRevision !== draft.storageRevision) throw new EncyclopediaError('DEVICE_STORAGE_CHANGED');
  if (current?.intent && !current.rejected && !current.receipt && comparableJSON(current.intent) !== comparableJSON(draft.intent)) throw new EncyclopediaError('DEVICE_STORAGE_CHANGED');
  if (current && comparableJSON(current) === comparableJSON(draft)) return;
  const nextRevision = draft.storageRevision + 1;
  try { storage.setItem(key(draft.scope), JSON.stringify({ ...draft, storageRevision: nextRevision })); } catch { throw new EncyclopediaError('DEVICE_STORAGE_UNAVAILABLE'); }
  // Only internal storage metadata changes; visual draft fields stay immutable.
  // Copies made by later edits inherit this successful revision-checked write.
  draft.storageRevision = nextRevision;
}
export function removeEncyclopediaDraft(draft: EncyclopediaDraft, storage: Storage = localStorage) {
  const current = readEncyclopediaDraft(draft.scope, storage);
  if (current && (current.draftId !== draft.draftId || current.storageRevision !== draft.storageRevision)) throw new EncyclopediaError('DEVICE_STORAGE_CHANGED');
  if (current?.intent && !current.rejected && !current.receipt) throw new EncyclopediaError('DEVICE_STORAGE_CHANGED');
  try { storage.removeItem(key(draft.scope)); } catch { throw new EncyclopediaError('DEVICE_STORAGE_UNAVAILABLE'); }
}
