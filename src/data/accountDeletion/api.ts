import { supabase, supabaseBackendId, supabasePublicKey } from '@/integrations/supabase/client';
import { decodeDeletionRecord, decodeDeletionStatus, type DeletionRecord } from './types';
export class DeletionError extends Error { constructor(public readonly code: string) { super(code); } }
export const prePreparationErrors = new Set(['STALE_RELATIONSHIP', 'STALE_RELATIONSHIP_SESSION', 'DELETION_BUSY', 'VALID_IDENTITY_REQUIRED', 'ACCOUNT_UNAVAILABLE',
  'LIFECYCLE_INTEGRATION_REQUIRED', 'LIFECYCLE_ACCOUNTING_INTEGRATION_REQUIRED', 'DELETION_REFERENCE_REVIEW_REQUIRED', 'AUTHENTICATION_REQUIRED', 'INVALID_DELETION_REQUEST']);
export function deletionErrorText(error: unknown): string {
  const code = error instanceof DeletionError ? error.code : '';
  if (code === 'DELETION_BUSY') return 'Deletion could not start because connected data is being updated. Nothing has been scheduled. Retry this same request later.';
  if (code === 'DELETION_UNAVAILABLE') return 'This saved deletion request could not be found or verified. Keep its recovery information and check again; this is not confirmation of deletion.';
  if (prePreparationErrors.has(code)) return 'Deletion did not start. Your account connection or connected data needs to be checked before you confirm again.';
  if (code === 'ACCOUNT_CHANGED') return 'The signed-in account changed. This deletion request was not submitted for the new account.';
  return 'The deletion result is unknown. Keep this saved request and check its status before starting anything else.';
}
interface Dependencies { backendId: string; publicKey: string; fetch: typeof fetch; session: () => Promise<{ accountId: string; token: string } | null>; timeoutMs?: number }
export function createDeletionTransport(deps: Dependencies) {
  async function request(record: DeletionRecord, operation: 'start' | 'status' | 'resume', outer?: AbortSignal) {
    decodeDeletionRecord(record);
    if (record.scope.backendId !== deps.backendId || !record.recoveryToken) throw new DeletionError('DELETION_UNAVAILABLE');
    const controller = new AbortController(); const abort = () => controller.abort(new DOMException('Deletion request cancelled', 'AbortError'));
    if (outer?.aborted) { abort(); throw controller.signal.reason; } outer?.addEventListener('abort', abort, { once: true });
    let fail!: (error: unknown) => void; const deadline = new Promise<never>((_resolve, reject) => { fail = reject; });
    const onAbort = () => fail(controller.signal.reason); controller.signal.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(new DeletionError('DELETION_UNCONFIRMED')), deps.timeoutMs ?? 20_000);
    try { return await Promise.race([deadline, (async () => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', apikey: deps.publicKey };
      if (operation === 'start') {
        const session = await deps.session(); if (controller.signal.aborted) throw controller.signal.reason;
        if (!session || session.accountId !== record.scope.accountId || !session.token) throw new DeletionError('ACCOUNT_CHANGED');
        headers.Authorization = `Bearer ${session.token}`;
      }
      const body = operation === 'start' ? { commandId: record.jobId, expectedRelationshipId: record.scope.relationshipId,
        expectedRelationshipSessionId: record.scope.relationshipSessionId, recoveryToken: record.recoveryToken } : { jobId: record.jobId, recoveryToken: record.recoveryToken };
      const response = await deps.fetch(`${deps.backendId}/functions/v1/account-deletion/${operation}`, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal, credentials: 'omit', cache: 'no-store', redirect: 'error' });
      if (controller.signal.aborted) throw controller.signal.reason;
      const value = await response.json(); if (controller.signal.aborted) throw controller.signal.reason;
      if (!response.ok) {
        const code = typeof value?.error?.code === 'string' && /^[A-Z_]{1,70}$/.test(value.error.code) ? value.error.code : 'DELETION_UNCONFIRMED';
        // Server messages and request objects can never become logs or UI text.
        throw new DeletionError(code);
      }
      return decodeDeletionStatus(value, record.jobId);
    })()]); } finally { clearTimeout(timer); outer?.removeEventListener('abort', abort); controller.signal.removeEventListener('abort', onAbort); controller.abort(); }
  }
  return { start: (record: DeletionRecord, signal?: AbortSignal) => request(record, 'start', signal), status: (record: DeletionRecord, signal?: AbortSignal) => request(record, 'status', signal),
    resume: (record: DeletionRecord, signal?: AbortSignal) => request(record, 'resume', signal) };
}
export type DeletionTransport = ReturnType<typeof createDeletionTransport>;
export const deletionTransport = createDeletionTransport({ backendId: supabaseBackendId, get publicKey() { return supabasePublicKey; }, fetch: (input, init) => fetch(input, init),
  session: async () => { const { data: { session }, error } = await supabase.auth.getSession(); return error || !session ? null : { accountId: session.user.id, token: session.access_token }; },
});
