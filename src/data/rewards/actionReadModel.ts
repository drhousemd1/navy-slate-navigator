import { supabase, supabaseBackendId } from '@/integrations/supabase/client';
import type { ActionFeedback, Currency } from '@/domain/actions/types';
import type { ActionQueueScope } from '@/data/actions/contracts';
import type { Reward } from './types';
import { actionReadError, readDefinitionCatalog, type DefinitionCatalog, type PreviousCatalog } from '@/data/actions/definitionCatalog';
import { isRelationshipSessionId } from '@/lib/identity';

export interface RewardEventRow {
  id: string; relationship_id: string; kind: string; reward_id: string | null;
  actor_participant_id: string | null; beneficiary_participant_id: string | null;
  subject: { title: string; role: Currency | null }; recorded_at: string;
  calendar: { localDate: string; weekStartDate: string; timeZone: string } | null;
  reverses_event_id: string | null; provenance: string;
}
export interface RewardLotRow {
  id: string; relationship_id: string; reward_id: string; owner_participant_id: string;
  currency: Currency; status: 'available' | 'redeemed' | 'cancelled';
  acquisition_event_id: string; active_redemption_event_id: string | null;
}
export interface RewardWalletRow { participant_id: string; relationship_id: string; currency: Currency; balance: number }
export interface RewardPointRow { id: string; relationship_id: string; event_id: string; participant_id: string; currency: Currency; amount: number }
export interface RefundDelivery {
  event_id: string; recipient_participant_id: string; relationship_id: string; kind: string; payload: ActionFeedback;
}
export interface ImportedRewardUsage {
  id: string; relationship_id: string; reward_id: string | null;
  action_event_id: null; created_at: string | null; used: boolean | null;
  /** A present-day catalog reference, never a historical title snapshot. */
  currentTitle?: string;
}
export interface RewardActionData {
  /** Includes removed definitions for history titles and revision reuse; never persisted. */
  definitionCatalog?: DefinitionCatalog<Reward>;
  rewards: Reward[]; wallets: RewardWalletRow[]; lots: RewardLotRow[]; events: RewardEventRow[]; points: RewardPointRow[];
  deliveries: RefundDelivery[]; acknowledged: string[];
  importedUsage: ImportedRewardUsage[];
}
export const rewardActionKey = (scope: ActionQueueScope | null) => ['reward-action-state', supabaseBackendId, scope?.accountId, scope?.relationshipId, scope?.relationshipSessionId] as const;
export const accountingStatusKey = (scope: ActionQueueScope | null) => ['action-accounting-status', supabaseBackendId, scope?.accountId, scope?.relationshipId, scope?.relationshipSessionId] as const;

export async function rewardReadToken(accountId: string, signal?: AbortSignal): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (error || !session || session.user.id !== accountId) throw new Error('The signed-in account changed. Reload before continuing.');
  return session.access_token;
}
// Forward-migration tables are intentionally isolated at this boundary until
// generated types are refreshed. Components never construct database requests.
const database = supabase as any;
export function requireActionSession(scope: ActionQueueScope): string {
  if (scope.backendId !== supabaseBackendId || !isRelationshipSessionId(scope.relationshipSessionId)) {
    throw new Error('Your connection could not be verified. Reload before continuing.');
  }
  return scope.relationshipSessionId;
}
/** Check both sides of a multi-request operation: the same pair may have
 * continued this period with a new session while its response was in flight. */
export async function assertCurrentActionScope(scope: ActionQueueScope, token: string, signal?: AbortSignal): Promise<void> {
  const sessionId = requireActionSession(scope);
  await rewardReadToken(scope.accountId, signal);
  const { data, error } = await database.rpc('get_my_identity').setHeader('Authorization', `Bearer ${token}`).abortSignal(signal);
  if (error || !['ready_solo', 'ready_linked'].includes(data?.status) || data?.relationship_status !== 'active' ||
    data?.user_id !== scope.accountId || data?.relationship_id !== scope.relationshipId || data?.participant_id !== scope.participantId ||
    data?.relationship_session_id !== sessionId) throw new Error('Your connection changed or could not be verified. Reload before continuing.');
  await rewardReadToken(scope.accountId, signal);
}
export async function actionScopeToken(scope: ActionQueueScope, signal?: AbortSignal): Promise<string> {
  requireActionSession(scope);
  const token = await rewardReadToken(scope.accountId, signal);
  await assertCurrentActionScope(scope, token, signal);
  return token;
}
export async function readAccountingEnabled(scope: ActionQueueScope, signal?: AbortSignal): Promise<boolean> {
  const token = await actionScopeToken(scope, signal);
  const { data, error } = await database.from('action_accounting_periods').select('relationship_id,accounting_enabled')
    .eq('relationship_id', scope.relationshipId).maybeSingle().setHeader('Authorization', `Bearer ${token}`).abortSignal(signal);
  if (error) throw new Error('Reward accounting status could not be checked. Retry before taking an action.');
  await assertCurrentActionScope(scope, token, signal);
  if (data && (data.relationship_id !== scope.relationshipId || typeof data.accounting_enabled !== 'boolean')) throw new Error('Invalid accounting status.');
  return data?.accounting_enabled === true;
}
async function readRows<T>(table: string, fields: string, scope: ActionQueueScope, token: string, signal?: AbortSignal, order = 'id', importedOnly = false): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += 500) {
    const request = database.from(table).select(fields).eq('relationship_id', scope.relationshipId);
    if (importedOnly) request.is('action_event_id', null);
    const { data, error, status } = await request.order(order).range(start, start + 499).setHeader('Authorization', `Bearer ${token}`).abortSignal(signal);
    if (error || !Array.isArray(data)) throw actionReadError('Confirmed reward data could not be loaded. Retry to refresh it.', table, error, status);
    if (data.some(row => row.relationship_id !== scope.relationshipId)) throw new Error('Reward data belongs to a different relationship.');
    if (importedOnly && data.some(row => row.action_event_id !== null)) throw new Error('Imported reward history could not be verified.');
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
export async function readRewardActionData(scope: ActionQueueScope, signal?: AbortSignal, previous?: PreviousCatalog<Reward>): Promise<RewardActionData> {
  const token = await actionScopeToken(scope, signal);
  const [definitionCatalog, wallets, lots, events, points, deliveries, acks, importedUsage] = await Promise.all([
    readDefinitionCatalog<Reward>('rewards', 'id,relationship_id,title,description,cost,supply,is_dom_reward,background_image_url,background_opacity,icon_name,icon_color,title_color,subtext_color,calendar_color,highlight_effect,focal_point_x,focal_point_y,image_meta,created_at,updated_at,deleted_at', scope, token, signal, previous, 'Confirmed reward data could not be loaded. Retry to refresh it.'),
    readRows<RewardWalletRow>('action_wallets', 'participant_id,relationship_id,currency,balance', scope, token, signal, 'participant_id'),
    readRows<RewardLotRow>('reward_inventory_lots', 'id,relationship_id,reward_id,owner_participant_id,currency,status,acquisition_event_id,active_redemption_event_id', scope, token, signal),
    readRows<RewardEventRow>('action_events', 'id,relationship_id,kind,reward_id,actor_participant_id,beneficiary_participant_id,subject,recorded_at,calendar,reverses_event_id,provenance', scope, token, signal),
    readRows<RewardPointRow>('action_point_entries', 'id,relationship_id,event_id,participant_id,currency,amount', scope, token, signal),
    readRows<RefundDelivery>('action_feedback_outbox', 'event_id,recipient_participant_id,relationship_id,kind,payload', scope, token, signal, 'event_id'),
    readRows<{ event_id: string }>('action_feedback_acknowledgments', 'event_id,relationship_id', scope, token, signal, 'event_id'),
    readRows<ImportedRewardUsage>('reward_usage', 'id,relationship_id,reward_id,action_event_id,created_at,used', scope, token, signal, 'id', true),
  ]);
  await assertCurrentActionScope(scope, token, signal);
  if (deliveries.some(row => row.recipient_participant_id !== scope.participantId)) throw new Error('Invalid refund recipient.');
  const rewards = definitionCatalog.rows;
  // Keep the original newest-first catalog within each role group. ID ordering
  // above is for stable pagination, not a replacement for presentation order.
  return { definitionCatalog, rewards: rewards.filter(reward => !reward.deleted_at).sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')), wallets, lots, events: events.filter(event => event.reward_id), points, deliveries, acknowledged: acks.map(row => row.event_id),
    importedUsage: importedUsage.map(row => ({ ...row, currentTitle: rewards.find(reward => reward.id === row.reward_id)?.title })) };
}
export async function acknowledgeRewardFeedback(scope: ActionQueueScope, eventId: string, kind: 'points_refunded' | 'action_confirmed' = 'points_refunded'): Promise<void> {
  const token = await actionScopeToken(scope);
  const { error } = await database.rpc('acknowledge_action_feedback', {
    p_expected_relationship_id: scope.relationshipId, p_expected_relationship_session_id: scope.relationshipSessionId, p_event_id: eventId, p_kind: kind,
  }).setHeader('Authorization', `Bearer ${token}`);
  if (error) throw new Error('Dismissal could not be confirmed. Retry dismissal; the action itself is already recorded.');
  await assertCurrentActionScope(scope, token);
}

export function rewardInventory(lots: readonly RewardLotRow[], rewardId: string) {
  return (['sub', 'dom'] as const).map(currency => ({ currency,
    quantity: lots.filter(lot => lot.reward_id === rewardId && lot.currency === currency && lot.status === 'available').length,
  })).filter(item => item.quantity > 0);
}
export function rewardUndoReason(event: RewardEventRow, data: RewardActionData, participantId: string, role: Currency, permissions: Readonly<Record<string, string>>): string | null {
  if (data.events.some(item => item.reverses_event_id === event.id)) return 'Already undone; both records stay in History.';
  if (event.kind === 'reward_purchased') {
    const lot = data.lots.find(item => item.acquisition_event_id === event.id);
    if (event.actor_participant_id !== participantId) return 'Only the buyer can undo this purchase.';
    if (lot?.status === 'redeemed') return 'Undo its Use event first.';
    if (lot?.status !== 'available') return 'This purchase was already cancelled or refunded.';
    return null;
  }
  if (event.kind === 'reward_redeemed') {
    const lot = data.lots.find(item => item.active_redemption_event_id === event.id);
    if (!lot) return 'This Use is no longer active.';
    if (lot.currency === 'dom' ? role !== 'dom' : !['both', role].includes(permissions.sub_reward_redeem_undo)) return 'Your relationship permission does not allow this Undo.';
    return null;
  }
  return 'This record is kept as permanent history.';
}
