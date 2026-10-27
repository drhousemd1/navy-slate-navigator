import { supabase, supabaseBackendId } from '@/integrations/supabase/client';
import { actionScopeToken, assertCurrentActionScope } from '@/data/rewards/actionReadModel';
import { decodeExpectedContext, type ActionQueueScope } from '@/data/actions/contracts';
import type { ActionCalendar, Currency, RecordingProgress, RuleExpectedContext, PunishmentExpectedContext } from '@/domain/actions/types';
import type { Rule } from '@/data/interfaces/Rule';
import type { PunishmentData } from '@/contexts/punishments/types';

export type RecordingType = 'rule' | 'punishment';
export type RecordingDefinition = (Rule | PunishmentData) & { id: string; relationship_id: string; deleted_at: string | null };
export interface RecordingEvent {
  id: string; relationship_id: string; rule_id: string | null; punishment_id: string | null;
  kind: string; actor_participant_id: string | null; beneficiary_participant_id: string | null;
  subject: { title: string; role: Currency | null }; calendar: ActionCalendar | null;
  recorded_at: string; reverses_event_id: string | null; provenance: string;
}
export interface RecordingPoint {
  id: string; relationship_id: string; event_id: string; participant_id: string; currency: Currency;
  amount: number; calendar: ActionCalendar | null;
}
export interface ImportedRecording {
  id: string; relationship_id: string; action_event_id: null;
  rule_id?: string | null; punishment_id?: string | null;
  violation_date?: string; applied_date?: string | null;
  day_of_week: number; week_number?: string; points_deducted?: number;
  currentTitle?: string;
}
export interface RecordingData { definitions: RecordingDefinition[]; progress: RecordingProgress[]; events: RecordingEvent[]; points: RecordingPoint[]; imported: ImportedRecording[] }
export const recordingKey = (scope: ActionQueueScope | null, type: RecordingType) =>
  ['recording-action-state', supabaseBackendId, scope?.accountId, scope?.relationshipId, scope?.relationshipSessionId, type] as const;
const tableFor = (type: RecordingType) => type === 'rule' ? 'rules' : 'punishments';
// Forward-migration schema is kept at this one boundary until generated types are refreshed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const database = supabase as any;
const commonFields = 'id,relationship_id,title,description,background_image_url,background_opacity,icon_name,icon_color,title_color,subtext_color,calendar_color,highlight_effect,focal_point_x,focal_point_y,image_meta,created_at,updated_at,deleted_at';
async function rows<T>(table: string, fields: string, scope: ActionQueueScope, token: string, signal?: AbortSignal, importedOnly = false): Promise<T[]> {
  const result: T[] = [];
  for (let start = 0; ; start += 500) {
    const request = database.from(table).select(fields).eq('relationship_id', scope.relationshipId);
    if (importedOnly) request.is('action_event_id', null);
    const { data, error } = await request.order('id')
      .range(start, start + 499).setHeader('Authorization', `Bearer ${token}`).abortSignal(signal);
    if (error || !Array.isArray(data)) throw new Error('Confirmed activity could not be loaded. Refresh to retry.');
    if (data.some(row => row.relationship_id !== scope.relationshipId)) throw new Error('Activity belongs to a different relationship.');
    if (importedOnly && data.some(row => row.action_event_id !== null)) throw new Error('Imported history could not be verified.');
    result.push(...data);
    if (data.length < 500) return result;
  }
}
/** Prevent a definition/progress read race from changing the facts reviewed on the card. */
export function reviewedRecordingContext(type: RecordingType, definition: RecordingDefinition, progress?: RecordingProgress): RuleExpectedContext | PunishmentExpectedContext {
  const context = decodeExpectedContext(progress?.expectedContext);
  if (context.kind !== (type === 'rule' ? 'rule_violation' : 'punishment_apply') ||
      !progress || progress.subjectType !== type || progress.subjectId !== definition.id || context.subjectId !== definition.id ||
      context.sub.participantId !== progress.beneficiaryParticipantId || context.sub.timeZone !== progress.timeZone ||
      context.sub.localDate !== progress.localDate || context.sub.weekStartDate !== progress.weekStartDate ||
      (context.kind === 'punishment_apply' && (context.subDeduction !== (definition as PunishmentData).points || context.domAward !== (definition as PunishmentData).dom_points))) {
    throw new Error('Action details changed while loading. Refresh and review them before recording an action.');
  }
  return context;
}
export async function readRecordingData(scope: ActionQueueScope, type: RecordingType, hasSub: boolean, signal?: AbortSignal): Promise<RecordingData> {
  const token = await actionScopeToken(scope, signal);
  const progressRequest = hasSub ? database.rpc('get_recording_progress', { p_expected_relationship_id: scope.relationshipId, p_subject_type: type })
    .setHeader('Authorization', `Bearer ${token}`).abortSignal(signal) : Promise.resolve({ data: [], error: null });
  const [definitions, events, points, progress, imported] = await Promise.all([
    rows<RecordingDefinition>(tableFor(type), `${commonFields},${type === 'rule' ? 'priority,icon_url' : 'points,dom_points,dom_supply'}`, scope, token, signal),
    rows<RecordingEvent>('action_events', 'id,relationship_id,rule_id,punishment_id,kind,actor_participant_id,beneficiary_participant_id,subject,calendar,recorded_at,reverses_event_id,provenance', scope, token, signal),
    rows<RecordingPoint>('action_point_entries', 'id,relationship_id,event_id,participant_id,currency,amount,calendar', scope, token, signal),
    progressRequest,
    rows<ImportedRecording>(type === 'rule' ? 'rule_violations' : 'punishment_history',
      `id,relationship_id,action_event_id,day_of_week,${type === 'rule' ? 'rule_id,violation_date,week_number' : 'punishment_id,applied_date,points_deducted'}`,
      scope, token, signal, true),
  ]);
  await assertCurrentActionScope(scope, token, signal);
  if (progress.error || !Array.isArray(progress.data)) throw new Error('The current weekly activity could not be verified. Refresh to retry.');
  if (progress.data.some((item: RecordingProgress) => item.subjectType !== type || !definitions.some(row => row.id === item.subjectId) ||
    !Array.isArray(item.usageData) || item.usageData.length !== 7 || item.usageData.some(n => !Number.isSafeInteger(n) || n < 0))) {
    throw new Error('Invalid weekly activity received.');
  }
  const seen = new Set<string>();
  for (const item of progress.data as RecordingProgress[]) {
    const definition = definitions.find(row => row.id === item.subjectId && !row.deleted_at);
    if (!definition || seen.has(item.subjectId)) throw new Error('The current activity details changed. Refresh to review them.');
    seen.add(item.subjectId);
    reviewedRecordingContext(type, definition, item);
  }
  if (hasSub && definitions.some(row => !row.deleted_at && !seen.has(row.id))) throw new Error('The current activity details are incomplete. Refresh to review them.');
  const selectedEvents = events.filter(event => type === 'rule' ? event.rule_id : event.punishment_id);
  const ids = new Set(selectedEvents.map(event => event.id));
  return { definitions: definitions.filter(row => !row.deleted_at), progress: progress.data, events: selectedEvents, points: points.filter(row => ids.has(row.event_id)),
    imported: imported.map(row => ({ ...row, currentTitle: definitions.find(definition => definition.id === (type === 'rule' ? row.rule_id : row.punishment_id))?.title })) };
}
const sharedEditable = ['title', 'description', 'background_image_url', 'background_opacity', 'icon_name', 'icon_color', 'title_color',
  'subtext_color', 'calendar_color', 'highlight_effect', 'focal_point_x', 'focal_point_y', 'image_meta'];
export function recordingDefinitionValues(type: RecordingType, values: Partial<Rule & PunishmentData>): Record<string, unknown> {
  const allowed = [...sharedEditable, ...(type === 'rule' ? ['priority', 'icon_url'] : ['points', 'dom_points'])];
  const result = Object.fromEntries(allowed.filter(key => Object.prototype.hasOwnProperty.call(values, key) && values[key] !== undefined).map(key => [key, values[key]]));
  if (typeof result.title !== 'string' || !result.title.trim()) throw new Error('Enter a title before saving.');
  if (type === 'punishment' && ['points', 'dom_points'].some(key => !Number.isSafeInteger(result[key]) || Number(result[key]) < 0)) throw new Error('Points must be whole numbers of zero or more.');
  return result;
}
export async function saveRecordingDefinition(scope: ActionQueueScope, type: RecordingType, values: Partial<Rule & PunishmentData>, isCurrent: () => boolean): Promise<RecordingDefinition> {
  const payload = recordingDefinitionValues(type, values);
  const token = await actionScopeToken(scope);
  if (!isCurrent()) throw new Error('Your account or relationship changed. Reopen the editor.');
  const request = values.id ? database.from(tableFor(type)).update(payload).eq('id', values.id).eq('relationship_id', scope.relationshipId).is('deleted_at', null)
    : database.from(tableFor(type)).insert({ ...payload, user_id: scope.accountId, relationship_id: scope.relationshipId });
  const { data, error } = await request.select().single().setHeader('Authorization', `Bearer ${token}`).setHeader('x-relationship-session-id', scope.relationshipSessionId);
  if (error || !data) throw new Error(error?.message || 'The definition could not be saved. Your draft is still open.');
  await assertCurrentActionScope(scope, token);
  if (!isCurrent()) throw new Error('Your account or relationship changed after saving. Reload the current account.');
  return data;
}
export async function removeRecordingDefinition(scope: ActionQueueScope, type: RecordingType, id: string, isCurrent: () => boolean): Promise<void> {
  const token = await actionScopeToken(scope);
  if (!isCurrent()) throw new Error('Your account or relationship changed. Reopen the editor.');
  const { data, error } = await database.from(tableFor(type)).update({ deleted_at: new Date().toISOString() }).eq('id', id)
    .eq('relationship_id', scope.relationshipId).is('deleted_at', null).select('id').single().setHeader('Authorization', `Bearer ${token}`).setHeader('x-relationship-session-id', scope.relationshipSessionId);
  if (error || !data) throw new Error(error?.message || 'Removal was not confirmed. Refresh before retrying.');
  await assertCurrentActionScope(scope, token);
  if (!isCurrent()) throw new Error('Your account or relationship changed after removal. Reload the current account.');
}
export function recordingUndoReason(event: RecordingEvent, events: readonly RecordingEvent[], role: Currency, permissions: Readonly<Record<string, string>>): string | null {
  if (!['rule_violated', 'punishment_applied'].includes(event.kind) || event.provenance !== 'command') return 'This record is retained as history.';
  if (events.some(row => row.reverses_event_id === event.id)) return 'Already undone; both records remain in History.';
  const permission = permissions[event.kind === 'rule_violated' ? 'rule_violation_undo' : 'punishment_undo'];
  return ['both', role].includes(permission) ? null : 'Your relationship permission does not allow this Undo.';
}
export function savedWeekday(localDate?: string): number | undefined {
  if (!localDate || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return undefined;
  return (new Date(`${localDate}T12:00:00Z`).getUTCDay() + 6) % 7;
}
