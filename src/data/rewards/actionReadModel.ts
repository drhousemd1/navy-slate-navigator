import { supabase, supabaseBackendId } from '@/integrations/supabase/client';
import type { ActionFeedback, Currency } from '@/domain/actions/types';
import type { ActionQueueScope } from '@/data/actions/contracts';
import type { Reward } from './types';

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
export interface RewardActionData {
  rewards: Reward[]; wallets: RewardWalletRow[]; lots: RewardLotRow[]; events: RewardEventRow[]; points: RewardPointRow[];
  deliveries: RefundDelivery[]; acknowledged: string[];
}
export const rewardActionKey = (scope: ActionQueueScope | null) => ['reward-action-state', supabaseBackendId, scope?.accountId, scope?.relationshipId] as const;
export const accountingStatusKey = (scope: ActionQueueScope | null) => ['action-accounting-status', supabaseBackendId, scope?.accountId, scope?.relationshipId] as const;

export async function rewardReadToken(accountId: string, signal?: AbortSignal): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (error || !session || session.user.id !== accountId) throw new Error('The signed-in account changed. Reload before continuing.');
  return session.access_token;
}
// Forward-migration tables are intentionally isolated at this boundary until
// generated types are refreshed. Components never construct database requests.
const database = supabase as any;
export async function readAccountingEnabled(scope: ActionQueueScope, signal?: AbortSignal): Promise<boolean> {
  const token = await rewardReadToken(scope.accountId, signal);
  const { data, error } = await database.from('action_accounting_periods').select('relationship_id,accounting_enabled')
    .eq('relationship_id', scope.relationshipId).maybeSingle().setHeader('Authorization', `Bearer ${token}`).abortSignal(signal);
  if (error) throw new Error('Reward accounting status could not be checked. Retry before taking an action.');
  await rewardReadToken(scope.accountId, signal);
  if (data && (data.relationship_id !== scope.relationshipId || typeof data.accounting_enabled !== 'boolean')) throw new Error('Invalid accounting status.');
  return data?.accounting_enabled === true;
}
async function readRows<T>(table: string, fields: string, scope: ActionQueueScope, token: string, signal?: AbortSignal, order = 'id'): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await database.from(table).select(fields).eq('relationship_id', scope.relationshipId)
      .order(order).range(start, start + 499).setHeader('Authorization', `Bearer ${token}`).abortSignal(signal);
    if (error || !Array.isArray(data)) throw new Error('Confirmed reward data could not be loaded. Retry to refresh it.');
    if (data.some(row => row.relationship_id !== scope.relationshipId)) throw new Error('Reward data belongs to a different relationship.');
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
export async function readRewardActionData(scope: ActionQueueScope, signal?: AbortSignal): Promise<RewardActionData> {
  const token = await rewardReadToken(scope.accountId, signal);
  const [rewards, wallets, lots, events, points, deliveries, acks] = await Promise.all([
    readRows<Reward>('rewards', 'id,relationship_id,title,description,cost,supply,is_dom_reward,background_image_url,background_opacity,icon_name,icon_color,title_color,subtext_color,calendar_color,highlight_effect,focal_point_x,focal_point_y,image_meta,created_at,updated_at,deleted_at', scope, token, signal),
    readRows<RewardWalletRow>('action_wallets', 'participant_id,relationship_id,currency,balance', scope, token, signal, 'participant_id'),
    readRows<RewardLotRow>('reward_inventory_lots', 'id,relationship_id,reward_id,owner_participant_id,currency,status,acquisition_event_id,active_redemption_event_id', scope, token, signal),
    readRows<RewardEventRow>('action_events', 'id,relationship_id,kind,reward_id,actor_participant_id,beneficiary_participant_id,subject,recorded_at,calendar,reverses_event_id,provenance', scope, token, signal),
    readRows<RewardPointRow>('action_point_entries', 'id,relationship_id,event_id,participant_id,currency,amount', scope, token, signal),
    readRows<RefundDelivery>('action_feedback_outbox', 'event_id,recipient_participant_id,relationship_id,kind,payload', scope, token, signal, 'event_id'),
    readRows<{ event_id: string }>('action_feedback_acknowledgments', 'event_id,relationship_id', scope, token, signal, 'event_id'),
  ]);
  await rewardReadToken(scope.accountId, signal);
  if (deliveries.some(row => row.recipient_participant_id !== scope.participantId)) throw new Error('Invalid refund recipient.');
  return { rewards: rewards.filter(reward => !reward.deleted_at), wallets, lots, events: events.filter(event => event.reward_id), points, deliveries, acknowledged: acks.map(row => row.event_id) };
}
export async function acknowledgeRewardFeedback(scope: ActionQueueScope, eventId: string): Promise<void> {
  const token = await rewardReadToken(scope.accountId);
  const { error } = await database.rpc('acknowledge_action_feedback', {
    p_expected_relationship_id: scope.relationshipId, p_event_id: eventId, p_kind: 'points_refunded',
  }).setHeader('Authorization', `Bearer ${token}`);
  if (error) throw new Error('Dismissal could not be confirmed. Retry dismissal; the refund itself is already recorded.');
  await rewardReadToken(scope.accountId);
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
