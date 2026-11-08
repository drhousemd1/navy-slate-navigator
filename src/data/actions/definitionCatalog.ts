import { supabase } from '@/integrations/supabase/client';
import { scopeKey, type ActionQueueScope } from './contracts';

type DefinitionRow = { id: string; relationship_id?: string; updated_at?: string | null; deleted_at?: string | null };
type DefinitionTable = 'rewards' | 'tasks' | 'rules' | 'punishments';
export interface DefinitionCatalog<T> { scope: string; table: DefinitionTable; rows: T[] }
export type PreviousCatalog<T> = () => DefinitionCatalog<T> | undefined;

/** Keep diagnostics useful without retaining server messages, identifiers, or row contents. */
export function actionReadError(message: string, operation: string, error?: { code?: unknown } | null, status?: number): Error {
  return Object.assign(new Error(message), { cause: { operation,
    code: typeof error?.code === 'string' && /^[A-Z0-9_]{1,32}$/.test(error.code) ? error.code : null,
    status: Number.isInteger(status) ? status : null } });
}

// Legacy definitions contain inline artwork. Only one full definition request
// may run at once across mounted catalogs; lightweight activity reads stay parallel.
let heavyReadTail: Promise<void> = Promise.resolve();
async function boundedArtworkRead<T>(read: () => PromiseLike<T>, signal?: AbortSignal): Promise<T> {
  const preceding = heavyReadTail;
  let release!: () => void;
  heavyReadTail = new Promise<void>(resolve => { release = resolve; });
  await preceding;
  try {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    const result = await read();
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    return result;
  } finally { release(); }
}
const sameRevision = (left: DefinitionRow, right: DefinitionRow) => left.id === right.id &&
  left.relationship_id === right.relationship_id && (left.updated_at ?? null) === (right.updated_at ?? null) &&
  (left.deleted_at ?? null) === (right.deleted_at ?? null);
// Forward migration fields are isolated at this data boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const database = supabase as any;

/** Call only after actionScopeToken verifies the account and relationship session.
 * The previous catalog lives solely in that exact scoped query cache, never in
 * persistent storage. Server-owned revisions make partner edits visible each poll.
 */
export async function readDefinitionCatalog<T extends DefinitionRow>(table: DefinitionTable, fields: string,
  scope: ActionQueueScope, token: string, signal: AbortSignal | undefined, previous: PreviousCatalog<T> | undefined,
  failureMessage: string): Promise<DefinitionCatalog<T>> {
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  const cached = previous?.();
  const prior = new Map((cached?.scope === scopeKey(scope) && cached.table === table ? cached.rows : []).map(row => [row.id, row]));
  const revisions: DefinitionRow[] = [];
  const seen = new Set<string>();
  for (let start = 0; ; start += 500) {
    const { data, error, status } = await database.from(table).select('id,relationship_id,updated_at,deleted_at')
      .eq('relationship_id', scope.relationshipId).order('id').range(start, start + 499)
      .setHeader('Authorization', `Bearer ${token}`).abortSignal(signal);
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (error || !Array.isArray(data)) throw actionReadError(failureMessage, table, error, status);
    for (const row of data) {
      if (row.relationship_id !== scope.relationshipId) throw new Error('Definition data belongs to a different relationship.');
      if (typeof row.id !== 'string' || seen.has(row.id)) throw new Error('Definition data could not be verified. Refresh to retry.');
      seen.add(row.id); revisions.push(row);
    }
    if (data.length < 500) break;
  }
  const rows: T[] = [];
  for (const revision of revisions) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    const old = prior.get(revision.id);
    // Compare the raw timestamp, including PostgreSQL microseconds. Missing or
    // NULL revisions are never safe cache hits, even if both reads lack one.
    if (old && typeof revision.updated_at === 'string' && revision.updated_at.length > 0 && sameRevision(old, revision)) {
      rows.push(old); continue;
    }
    const { data, error, status } = await boundedArtworkRead<{ data: T[] | null; error: { code?: unknown } | null; status?: number }>(() =>
      database.from(table).select(fields).eq('relationship_id', scope.relationshipId).eq('id', revision.id)
        .range(0, 0).setHeader('Authorization', `Bearer ${token}`).abortSignal(signal), signal);
    if (error || !Array.isArray(data)) throw actionReadError(failureMessage, table, error, status);
    if (data.length !== 1 || !sameRevision(data[0], revision)) {
      throw new Error('Definition details changed while loading. Refresh and review them before taking an action.');
    }
    rows.push(data[0]);
  }
  return { scope: scopeKey(scope), table, rows };
}
