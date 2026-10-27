import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase, supabaseBackendId } from '@/integrations/supabase/client';
import { actionScopeToken, assertCurrentActionScope, type RewardEventRow, type RewardPointRow } from '@/data/rewards/actionReadModel';
import type { ActionQueueScope } from '@/data/actions/contracts';
import type { TaskProgress, Currency } from '@/domain/actions/types';
import type { TaskFormValues, TaskWithId } from './types';

export interface TaskEventRow extends Omit<RewardEventRow, 'reward_id'> { task_id: string }
export interface TaskDefinition extends TaskWithId { relationship_id: string; deleted_at: string | null }
export interface ImportedTaskCompletion { id: string; relationship_id: string; task_id: string; completed_at: string; action_event_id: string | null }
export interface TaskActionData {
  imported: ImportedTaskCompletion[];
  tasks: TaskDefinition[]; events: TaskEventRow[]; points: RewardPointRow[];
  progress: Record<string, TaskProgress>; progressErrors: Record<string, string>;
}
const integer = z.number().int().nonnegative();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const progressSchema = z.object({ taskId: z.string().uuid(), beneficiaryParticipantId: z.string().uuid(), currency: z.enum(['dom', 'sub']),
  timeZone: z.string().min(1), localDate: date, weekStartDate: date, weekIdentifier: z.string(),
  frequency: z.enum(['daily', 'weekly']), target: integer.positive(), currentCount: integer,
  usageData: z.array(integer).length(7), completed: z.boolean(), lastCompletedDate: date.nullable(), deleted: z.boolean() });
export function decodeTaskProgress(value: unknown): TaskProgress {
  const progress = progressSchema.parse(value) as TaskProgress;
  const day = taskDayIndex(progress);
  if (!Number.isInteger(day) || day < 0 || day > 6 || new Date(`${progress.weekStartDate}T00:00:00Z`).getUTCDay() !== 1) throw new Error('Invalid task calendar.');
  const count = progress.frequency === 'daily' ? progress.usageData[day] : progress.usageData.reduce((a, b) => a + b, 0);
  if (count !== progress.currentCount || progress.completed !== (count >= progress.target)) throw new Error('Invalid task counters.');
  return progress;
}
/** Date-only arithmetic: the browser timezone must never shift the affected person's date. */
export const taskDayIndex = (progress: Pick<TaskProgress, 'localDate' | 'weekStartDate'>) =>
  (Date.parse(`${progress.localDate}T00:00:00Z`) - Date.parse(`${progress.weekStartDate}T00:00:00Z`)) / 86_400_000;
export const taskActionKey = (scope: ActionQueueScope | null) => ['task-action-state', supabaseBackendId, scope?.accountId, scope?.relationshipId, scope?.relationshipSessionId] as const;
const database = supabase as any;
const fields = 'id,relationship_id,title,description,frequency,frequency_count,points,priority,icon_name,icon_color,icon_url,title_color,subtext_color,calendar_color,background_image_url,background_images,background_opacity,focal_point_x,focal_point_y,highlight_effect,image_meta,is_dom_task,created_at,updated_at,deleted_at';
async function rows<T>(table: string, selected: string, scope: ActionQueueScope, token: string, signal?: AbortSignal): Promise<T[]> {
  const result: T[] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await database.from(table).select(selected).eq('relationship_id', scope.relationshipId).order('id')
      .range(start, start + 499).setHeader('Authorization', `Bearer ${token}`).abortSignal(signal);
    if (error || !Array.isArray(data)) throw new Error('Confirmed task data could not be loaded. Retry to refresh it.');
    if (data.some(row => row.relationship_id !== scope.relationshipId)) throw new Error('Task data belongs to a different relationship.');
    result.push(...data);
    if (data.length < 500) return result;
  }
}
const configurationError = (message: string) => /TASK_OWNER_MISSING|TIMEZONE_REQUIRED|INVALID_TASK_DEFINITION/.test(message);
function progressProblem(message: string) {
  if (message.includes('TASK_OWNER_MISSING')) return 'This task needs a participant in its selected role.';
  if (message.includes('TIMEZONE_REQUIRED')) return 'The person assigned this task needs a saved timezone in Profile.';
  return 'This task needs a valid frequency, target, and nonnegative points. Edit it to continue.';
}
export async function readTaskActionData(scope: ActionQueueScope, signal?: AbortSignal): Promise<TaskActionData> {
  const token = await actionScopeToken(scope, signal);
  const requestProgress = (taskId: string | null) => database.rpc('get_task_progress', { p_expected_relationship_id: scope.relationshipId, p_task_id: taskId })
    .setHeader('Authorization', `Bearer ${token}`).abortSignal(signal);
  const [tasks, allEvents, points, imported, summary] = await Promise.all([
    rows<TaskDefinition>('tasks', fields, scope, token, signal),
    rows<TaskEventRow>('action_events', 'id,relationship_id,kind,task_id,actor_participant_id,beneficiary_participant_id,subject,recorded_at,calendar,reverses_event_id,provenance', scope, token, signal),
    rows<RewardPointRow>('action_point_entries', 'id,relationship_id,event_id,participant_id,currency,amount', scope, token, signal),
    rows<ImportedTaskCompletion>('task_completion_history', 'id,relationship_id,task_id,completed_at,action_event_id', scope, token, signal),
    requestProgress(null),
  ]);
  const progress: Record<string, TaskProgress> = {}, progressErrors: Record<string, string> = {};
  if (summary.error) {
    if (!configurationError(summary.error.message)) throw new Error('Task progress could not be loaded. Retry to refresh it.');
    // A repairable definition cannot hide other cards or immutable history.
    for (const task of tasks.filter(task => !task.deleted_at)) {
      const result = await requestProgress(task.id);
      if (result.error) {
        if (!configurationError(result.error.message)) throw new Error('Task progress could not be loaded. Retry to refresh it.');
        progressErrors[task.id] = progressProblem(result.error.message);
      } else {
        const value = decodeTaskProgress(result.data);
        if (value.taskId !== task.id) throw new Error('Task progress does not match its definition.');
        progress[value.taskId] = value;
      }
    }
  } else {
    if (!Array.isArray(summary.data)) throw new Error('Invalid task progress response.');
    for (const value of summary.data) {
      const parsed = decodeTaskProgress(value);
      if (!tasks.some(task => task.id === parsed.taskId && !task.deleted_at) || progress[parsed.taskId]) throw new Error('Unexpected task progress.');
      progress[parsed.taskId] = parsed;
    }
    for (const task of tasks.filter(task => !task.deleted_at)) if (!progress[task.id]) throw new Error('Task progress is incomplete.');
  }
  await assertCurrentActionScope(scope, token, signal);
  return { tasks, imported: imported.filter(row => !row.action_event_id), events: allEvents.filter(event => event.task_id), points, progress, progressErrors };
}
export function useTaskActionData(scope: ActionQueueScope | null, enabled: boolean) {
  return useQuery({ queryKey: taskActionKey(scope), enabled: enabled && !!scope,
    queryFn: ({ signal }) => readTaskActionData(scope!, signal), retry: false, staleTime: 0, refetchOnMount: 'always', refetchInterval: 10_000 });
}
const definitionFields = ['title', 'description', 'frequency', 'frequency_count', 'points', 'priority', 'icon_name', 'icon_color', 'icon_url', 'title_color', 'subtext_color', 'calendar_color', 'background_image_url', 'background_images', 'background_opacity', 'focal_point_x', 'focal_point_y', 'highlight_effect', 'image_meta', 'is_dom_task'] as const;
export function taskDefinitionPayload(input: TaskFormValues): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const field of definitionFields) if (field in input) output[field] = input[field] ?? null;
  if (typeof output.title !== 'string' || !output.title.trim() || !['daily', 'weekly'].includes(String(output.frequency)) ||
    !Number.isSafeInteger(output.frequency_count) || Number(output.frequency_count) < 1 || !Number.isSafeInteger(output.points) || Number(output.points) < 0) throw new Error('Enter a title, whole-number target of at least one, and nonnegative whole-number points.');
  return output;
}
export async function saveTaskDefinition(scope: ActionQueueScope, input: TaskFormValues, taskId?: string): Promise<void> {
  const token = await actionScopeToken(scope);
  const payload = taskDefinitionPayload(input);
  const request = taskId ? database.from('tasks').update(payload).eq('id', taskId).eq('relationship_id', scope.relationshipId).is('deleted_at', null)
    : database.from('tasks').insert({ ...payload, user_id: scope.accountId, relationship_id: scope.relationshipId });
  const { data, error } = await request.select('id,relationship_id').single().setHeader('Authorization', `Bearer ${token}`).setHeader('x-relationship-session-id', scope.relationshipSessionId);
  if (error || !data || data.relationship_id !== scope.relationshipId) throw new Error('Task save was not confirmed. Refresh the task before retrying; your changes remain in the editor.');
  await assertCurrentActionScope(scope, token);
}
export async function removeTaskDefinition(scope: ActionQueueScope, taskId: string): Promise<void> {
  const token = await actionScopeToken(scope);
  const { data, error } = await database.from('tasks').update({ deleted_at: new Date().toISOString() })
    .eq('id', taskId).eq('relationship_id', scope.relationshipId).is('deleted_at', null)
    .select('id,relationship_id').single().setHeader('Authorization', `Bearer ${token}`).setHeader('x-relationship-session-id', scope.relationshipSessionId);
  if (error || !data || data.relationship_id !== scope.relationshipId) throw new Error('Task removal was not confirmed. Refresh before retrying.');
  await assertCurrentActionScope(scope, token);
}
export const taskPermission = (permissions: Readonly<Record<string, string>>, role: Currency | null, operation: 'task_complete' | 'task_undo' | 'definition_manage') =>
  !!role && ['both', role].includes(permissions[operation]);
export function taskUndoReason(event: TaskEventRow, events: readonly TaskEventRow[], role: Currency | null, permissions: Readonly<Record<string, string>>): string | null {
  if (event.kind !== 'task_completed' || event.provenance !== 'command') return 'This record is kept as permanent history.';
  if (events.some(item => item.reverses_event_id === event.id)) return 'Already undone; both records stay in History.';
  if (!taskPermission(permissions, role, 'task_undo')) return 'Your relationship permission does not allow this Undo.';
  return null;
}
