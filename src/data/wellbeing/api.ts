import { supabase, supabaseBackendId } from '@/integrations/supabase/client';
import { DEFAULT_METRICS, type WellbeingMetrics, type WellbeingPerson, type WellbeingRequest, type WellbeingScope, type WellbeingSnapshot } from './types';

interface Response { data: unknown; error: { message: string; code?: string } | null }
interface Request extends PromiseLike<Response> { setHeader(name: string, value: string): Request; abortSignal(signal: AbortSignal): Request }
const rpc = supabase.rpc.bind(supabase) as unknown as (name: string, args: Record<string, unknown>) => Request;
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_WELLBEING_RESPONSE');
  return value as Record<string, unknown>;
};
const string = (value: unknown): string => { if (typeof value !== 'string' || !value) throw new Error('INVALID_WELLBEING_RESPONSE'); return value; };
const nullableString = (value: unknown): string | null => value === null ? null : string(value);
export function validateMetrics(value: unknown): WellbeingMetrics {
  const data = record(value);
  if (Object.keys(data).length !== 8 || Object.keys(DEFAULT_METRICS).some(key => typeof data[key] !== 'number' || !Number.isFinite(data[key]) || Number(data[key]) < 0 || Number(data[key]) > 100)) throw new Error('INVALID_WELLBEING_METRICS');
  return { ...data } as unknown as WellbeingMetrics;
}
export function decodeCheckin(value: unknown, scope: WellbeingScope, subject?: string): WellbeingSnapshot {
  const data = record(value);
  if (data.relationshipId !== scope.relationshipId || (subject && data.userId !== subject) ||
      typeof data.overallScore !== 'number' || !Number.isFinite(data.overallScore) || data.overallScore < 0 || data.overallScore > 100 ||
      !['confirmed_checkin', 'legacy_snapshot'].includes(String(data.provenance))) throw new Error('INVALID_WELLBEING_RESPONSE');
  const metrics: Partial<WellbeingMetrics> = {};
  const raw = data.metrics && typeof data.metrics === 'object' && !Array.isArray(data.metrics) ? data.metrics as Record<string, unknown> : {};
  for (const key of Object.keys(DEFAULT_METRICS) as (keyof WellbeingMetrics)[]) {
    const v = raw[key]; if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100) metrics[key] = v;
  }
  const result: WellbeingSnapshot = {
    id: string(data.id), userId: string(data.userId), participantId: nullableString(data.participantId), relationshipId: scope.relationshipId,
    relationshipSessionId: nullableString(data.relationshipSessionId), commandId: nullableString(data.commandId),
    metrics, rawMetrics: data.metrics, overallScore: data.overallScore, scoreVersion: nullableString(data.scoreVersion),
    recordedAt: nullableString(data.recordedAt), clientReportedAt: nullableString(data.clientReportedAt),
    timezone: nullableString(data.timezone), localDate: nullableString(data.localDate),
    provenance: data.provenance as WellbeingSnapshot['provenance'], legacyCreatedAt: nullableString(data.legacyCreatedAt), legacyUpdatedAt: nullableString(data.legacyUpdatedAt),
  };
  if (result.provenance === 'confirmed_checkin') {
    validateMetrics(data.metrics);
    if (!result.recordedAt || !Number.isFinite(Date.parse(result.recordedAt)) || !result.clientReportedAt || !Number.isFinite(Date.parse(result.clientReportedAt)) || !result.timezone || !result.localDate || !/^\d{4}-\d{2}-\d{2}$/.test(result.localDate) || !result.commandId || !result.participantId || !result.relationshipSessionId || result.scoreVersion !== 'needs-v1') throw new Error('INVALID_WELLBEING_RESPONSE');
  } else if (result.recordedAt !== null || result.localDate !== null || result.timezone !== null || result.commandId !== null) throw new Error('INVALID_WELLBEING_RESPONSE');
  return result;
}
export const WELLBEING_REQUEST_TIMEOUT_MS = 15_000;
async function call(scope: WellbeingScope, name: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> {
  if (scope.backendId !== supabaseBackendId) throw new Error('ACCOUNT_CHANGED');
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  let cancel: () => void;
  const cancelled = new Promise<never>((_resolve, reject) => {
    cancel = () => { controller.abort(); reject(new DOMException('Cancelled', 'AbortError')); };
    signal?.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(() => { controller.abort(); reject(new Error('WELLBEING_REQUEST_TIMEOUT')); }, WELLBEING_REQUEST_TIMEOUT_MS);
  });
  const perform = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (error || !session?.access_token || session.user.id !== scope.accountId) throw new Error('ACCOUNT_CHANGED');
    const result = await rpc(name, args).setHeader('Authorization', `Bearer ${session.access_token}`).abortSignal(controller.signal);
    if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (result.error) throw new Error(result.error.message);
    return result.data;
  };
  try { return await Promise.race([perform(), cancelled]); }
  finally { clearTimeout(timer!); signal?.removeEventListener('abort', cancel!); }
}
const parameters = (scope: WellbeingScope) => ({ p_expected_relationship_id: scope.relationshipId, p_expected_relationship_session_id: scope.relationshipSessionId });
export async function fetchWellbeingPeople(scope: WellbeingScope, signal?: AbortSignal): Promise<WellbeingPerson[]> {
  const data = await call(scope, 'get_wellbeing_status', parameters(scope), signal);
  if (!Array.isArray(data) || data.length > 2) throw new Error('INVALID_WELLBEING_RESPONSE');
  return data.map(value => { const item = record(value); const userId = string(item.userId);
    if (item.role !== 'dom' && item.role !== 'sub') throw new Error('INVALID_WELLBEING_RESPONSE');
    return { userId, role: item.role, timezone: nullableString(item.timezone), latest: item.latest === null ? null : decodeCheckin(item.latest, scope, userId) };
  });
}
export async function listWellbeing(scope: WellbeingScope, userId: string, range: { start: string; end: string } | null, signal?: AbortSignal): Promise<WellbeingSnapshot[]> {
  const all: WellbeingSnapshot[] = []; let before: WellbeingSnapshot | undefined;
  for (;;) {
    const data = await call(scope, 'list_wellbeing_checkins', { ...parameters(scope), p_subject_user_id: userId,
      p_mode: range ? 'dated' : 'legacy', p_start_date: range?.start ?? null, p_end_date: range?.end ?? null, p_limit: 100,
      p_before_recorded_at: before?.recordedAt ?? before?.legacyUpdatedAt ?? null, p_before_id: before?.id ?? null }, signal);
    if (!Array.isArray(data) || data.length > 100) throw new Error('INVALID_WELLBEING_RESPONSE');
    const page = data.map(value => decodeCheckin(value, scope, userId));
    if (page.some(row => all.some(existing => existing.id === row.id) || (range ? !row.localDate || row.localDate < range.start || row.localDate >= range.end : row.provenance !== 'legacy_snapshot'))) throw new Error('INVALID_WELLBEING_RESPONSE');
    all.push(...page); if (page.length < 100) return all; before = page.at(-1);
  }
}
export async function readWellbeingReceipt(request: WellbeingRequest, signal?: AbortSignal): Promise<WellbeingSnapshot | null> {
  const data = await call(request.scope, 'get_my_wellbeing_receipt', { p_command_id: request.commandId, p_relationship_id: request.scope.relationshipId }, signal);
  if (data === null) return null; // Errors throw: unavailable is never not-found.
  return validateReceipt(decodeCheckin(data, request.scope, request.scope.accountId), request);
}
function validateReceipt(row: WellbeingSnapshot, request: WellbeingRequest) {
  if (row.commandId !== request.commandId || row.relationshipSessionId !== request.scope.relationshipSessionId || row.timezone !== request.expectedTimezone || Date.parse(row.clientReportedAt ?? '') !== Date.parse(request.clientReportedAt) ||
      Object.keys(DEFAULT_METRICS).some(key => row.metrics[key as keyof WellbeingMetrics] !== request.metrics[key as keyof WellbeingMetrics])) throw new Error('INVALID_WELLBEING_RESPONSE');
  return row;
}
export async function saveWellbeingCheckin(request: WellbeingRequest, signal?: AbortSignal) {
  validateMetrics(request.metrics);
  const data = await call(request.scope, 'save_wellbeing_checkin', { ...parameters(request.scope), p_command_id: request.commandId,
    p_expected_timezone: request.expectedTimezone, p_metrics: request.metrics, p_client_reported_at: request.clientReportedAt }, signal);
  return validateReceipt(decodeCheckin(data, request.scope, request.scope.accountId), request);
}
export function wellbeingError(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  const messages: Record<string, string> = {
    ACCOUNT_CHANGED: 'Sign in to the original account before checking this saved report.',
    WELLBEING_TIMEZONE_CHANGED: 'Your saved timezone changed. Check the original result, then review a new report in your current timezone.',
    STALE_RELATIONSHIP: 'This report belongs to a different relationship. It has not been moved or sent in the current relationship.',
    STALE_RELATIONSHIP_SESSION: 'Your connection changed. This saved report cannot be sent in the new connection.',
    TIMEZONE_REQUIRED: 'Save your timezone in Profile before recording a check-in.',
    INVALID_WELLBEING_METRICS: 'Review all eight values. Each must be between 0 and 100.',
    DRAFT_STORAGE_UNAVAILABLE: 'Your draft could not be saved on this device. Nothing was sent; keep this page open and retry.',
    WELLBEING_REQUEST_TIMEOUT: 'Confirmation timed out. Your original report is saved on this device. Retry checks its result before sending it again.',
    DRAFT_CHANGED: 'A different saved report is pending in another tab. Reload to recover that report before continuing.',
    COMMAND_ID_REUSED: 'This saved request does not match its original report. Check its result before starting another.',
  };
  return messages[code] ?? 'The result could not be confirmed. Your saved report is unchanged. Retry checks its original result before sending it again.';
}
