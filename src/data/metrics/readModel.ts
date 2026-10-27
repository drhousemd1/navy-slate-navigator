import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase, supabaseBackendId } from '@/integrations/supabase/client';
import { actionScopeToken, assertCurrentActionScope } from '@/data/rewards/actionReadModel';
import type { ActionQueueScope } from '@/data/actions/contracts';
import { isValidTimezone } from '@/lib/identity';
import type { Currency } from '@/domain/actions/types';
import type { LegacyKind, LegacyMetricRecord, MetricEvent, MetricsSource } from './projection';

// New migration tables stay at this boundary until generated database types are refreshed.
const database: SupabaseClient = supabase;
export interface MetricPeople { subUserId: string | null; domUserId: string | null }
export interface MetricClock { role: Currency; timeZone: string }
export const METRICS_QUERY_KEY = ['activity-metrics'] as const;
export const metricsScopeKey = (scope: ActionQueueScope | null) => [supabaseBackendId, scope?.accountId, scope?.participantId, scope?.relationshipId, scope?.relationshipSessionId];
const eventSchema = z.object({ id: z.string().uuid(), relationship_id: z.string().uuid(), kind: z.enum([
  'task_completed', 'rule_violated', 'punishment_applied', 'reward_purchased', 'reward_redeemed', 'reward_gifted',
  'reward_deleted', 'action_undone', 'opening_balance', 'opening_inventory']),
beneficiary_participant_id: z.string().uuid().nullable(), subject: z.object({ role: z.enum(['dom', 'sub']).nullable() }),
calendar: z.object({ participantId: z.string().uuid(), timeZone: z.string(), localDate: z.string(), weekStartDate: z.string() }).nullable(),
reverses_event_id: z.string().uuid().nullable() });
const loadError = () => new Error('Activity could not be verified. Retry to load the current records.');
/** Only current-pair profiles are permitted; private period memberships/snapshots are never read. */
export async function readMetricClocks(scope: ActionQueueScope, people: MetricPeople, signal?: AbortSignal): Promise<MetricClock[]> {
  const token = await actionScopeToken(scope, signal);
  const ids = [people.subUserId, people.domUserId].filter((id): id is string => !!id);
  if (!ids.includes(scope.accountId) || new Set(ids).size !== ids.length) throw loadError();
  const { data, error } = await database.from('profiles').select('id,role,timezone').in('id', ids)
    .setHeader('Authorization', `Bearer ${token}`).abortSignal(signal);
  if (error || !Array.isArray(data) || data.length !== ids.length) throw loadError();
  const clocks: MetricClock[] = [];
  for (const role of ['sub', 'dom'] as const) {
    const id = role === 'sub' ? people.subUserId : people.domUserId;
    if (!id) continue;
    const person = data.find(row => row.id === id);
    if (!person || person.role !== role) throw loadError();
    if (typeof person.timezone !== 'string' || !isValidTimezone(person.timezone)) {
      throw new Error(`The ${role === 'dom' ? 'Dom' : 'Sub'} needs a saved timezone in Profile before activity dates can be verified.`);
    }
    clocks.push({ role, timeZone: person.timezone });
  }
  await assertCurrentActionScope(scope, token, signal);
  return clocks;
}
async function rows(table: string, fields: string, scope: ActionQueueScope, token: string, legacyOnly: boolean, signal?: AbortSignal): Promise<Record<string, unknown>[]> {
  const result: Record<string, unknown>[] = [];
  for (let start = 0; ; start += 500) {
    let request = database.from(table).select(fields).eq('relationship_id', scope.relationshipId).order('id').range(start, start + 499);
    if (legacyOnly) request = request.is('action_event_id', null);
    const { data, error } = await request.setHeader('Authorization', `Bearer ${token}`).abortSignal(signal);
    if (error || !Array.isArray(data)) throw loadError();
    const page = z.array(z.object({ id: z.string().uuid(), relationship_id: z.string().uuid() }).passthrough()).parse(data);
    if (page.some(row => row.relationship_id !== scope.relationshipId)) throw loadError();
    result.push(...page);
    if (page.length < 500) break;
  }
  if (new Set(result.map(row => row.id)).size !== result.length) throw loadError();
  return result;
}
const histories = [
  { table: 'task_completion_history', kind: 'task', date: 'completed_at', join: 'tasks(is_dom_task)' },
  { table: 'rule_violations', kind: 'rule', date: 'violation_date', join: '' },
  { table: 'reward_usage', kind: 'reward', date: 'created_at', join: 'rewards(is_dom_reward)' },
  { table: 'punishment_history', kind: 'punishment', date: 'applied_date', join: '' },
] as const;
export async function readMetricsSource(scope: ActionQueueScope, mode: 'atomic' | 'legacy', signal?: AbortSignal): Promise<MetricsSource> {
  const token = await actionScopeToken(scope, signal);
  const [events, ...historiesData] = await Promise.all([
    mode === 'atomic' ? rows('action_events', 'id,relationship_id,kind,beneficiary_participant_id,subject,calendar,reverses_event_id', scope, token, false, signal)
      .then(data => data.map(row => eventSchema.parse(row) as MetricEvent)) : Promise.resolve([]),
    ...histories.map(history => rows(history.table, `id,relationship_id,${history.date}${mode === 'legacy' && history.join ? `,${history.join}` : ''}`, scope, token, mode === 'atomic', signal)),
  ]);
  const legacy: LegacyMetricRecord[] = historiesData.flatMap((data, index) => {
    const history = histories[index];
    return data.map(row => {
      const flag = history.kind === 'task' ? (row.tasks as { is_dom_task?: boolean } | null)?.is_dom_task
        : history.kind === 'reward' ? (row.rewards as { is_dom_reward?: boolean } | null)?.is_dom_reward : null;
      return { id: row.id, kind: history.kind as LegacyKind, recordedAt: row[history.date], role: flag === true ? 'dom' : flag === false ? 'sub' : null } as LegacyMetricRecord;
    });
  });
  await assertCurrentActionScope(scope, token, signal);
  return { mode, events, legacy };
}
