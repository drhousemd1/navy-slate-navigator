import React from 'react';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RewardsProvider, useRewards } from '@/contexts/RewardsContext';
import RewardCard from '@/components/RewardCard';
import { RewardActivity } from '@/components/rewards/RewardActivity';
import PointsBubbles from '@/components/common/PointsBubbles';
import { usePointsBubbleData } from '@/hooks/usePointsBubbleData';
import type { RewardActionData, RewardEventRow, RewardLotRow } from '@/data/rewards/actionReadModel';

const mocks = vi.hoisted(() => ({ actions: null as any, identity: null as any, legacy: vi.fn(), usage: vi.fn() }));
vi.mock('@/contexts/ActionCommandsContext', () => ({ useActionCommands: () => mocks.actions }));
vi.mock('@/contexts/UserIdsContext', () => ({ useUserIds: () => mocks.identity }));
vi.mock('@/data/rewards/useRewardsData', () => ({ useRewardsData: (...args: any[]) => mocks.legacy(...args) }));
vi.mock('@/data/rewards/queries/useRewardUsageQuery', () => ({ useRewardUsageQuery: (...args: any[]) => mocks.usage(...args) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: vi.fn() } }, supabaseBackendId: 'http://127.0.0.1:28622' }));
vi.mock('@/components/rewards/RewardContent', () => ({ default: ({ title }: any) => <h2>{title}</h2> }));
const reward: any = { id: 'reward', title: 'Quiet evening', cost: 7, supply: 1, is_dom_reward: false, background_opacity: 100 };
const lot = (values: Partial<RewardLotRow> = {}): RewardLotRow => ({ id: 'lot', relationship_id: 'period', reward_id: 'reward', owner_participant_id: 'sub-participant', currency: 'sub', status: 'available', acquisition_event_id: 'purchase', active_redemption_event_id: null, ...values });
const event = (values: Partial<RewardEventRow> = {}): RewardEventRow => ({ id: 'purchase', relationship_id: 'period', kind: 'reward_purchased', reward_id: 'reward', actor_participant_id: 'sub-participant', beneficiary_participant_id: 'sub-participant', subject: { title: 'Quiet evening', role: 'sub' }, recorded_at: '2026-10-26T12:00:00Z', calendar: null, reverses_event_id: null, provenance: 'command', ...values });
const data = (): RewardActionData => ({ rewards: [{ ...reward }], wallets: [
  { participant_id: 'sub-participant', relationship_id: 'period', currency: 'sub', balance: 30 },
  { participant_id: 'dom-participant', relationship_id: 'period', currency: 'dom', balance: 50 },
], lots: [lot()], events: [event()], points: [], deliveries: [], acknowledged: [], importedUsage: [] });
beforeEach(() => {
  mocks.actions = { scope: { backendId: 'http://127.0.0.1:28622', accountId: 'sub', participantId: 'sub-participant', relationshipId: 'period' }, mode: 'atomic', data: data(), entries: [], confirmed: [], error: null, enqueue: vi.fn().mockResolvedValue(undefined), refresh: vi.fn().mockResolvedValue(undefined), retry: vi.fn(), cancelUnsent: vi.fn() };
  mocks.identity = { currentRole: 'sub', participantId: 'sub-participant', permissions: { definition_manage: 'both', sub_reward_redeem: 'both', sub_reward_redeem_undo: 'both' } };
  mocks.legacy.mockReset(); mocks.usage.mockReset().mockReturnValue({ data: Array(7).fill(false) });
});
afterEach(cleanup);
function Balances() { const b = usePointsBubbleData(); return <output>{JSON.stringify(b)}</output>; }
function MountedCard() { const c = useRewards(); return <><RewardCard reward={c.rewards[0]} /><Balances /></>; }

describe('actual reward controls use the recorded command path', () => {
  it('saves the reviewed Buy price and does not optimistically change balances or inventory', async () => {
    render(<RewardsProvider><MountedCard /></RewardsProvider>);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Buy' }));
    expect(mocks.actions.enqueue).toHaveBeenCalledWith({ kind: 'reward_buy', rewardId: 'reward', expectedCost: 7 });
    expect(screen.getByRole('status').textContent).toContain('"subPoints":30');
    expect(screen.getByRole('status').textContent).toContain('"subRewardTypesCount":1');
    expect(mocks.legacy).not.toHaveBeenCalled();
    expect(mocks.usage).toHaveBeenCalledWith('reward', false);
  });
  it('does not fall back to old mutations when the command cannot be saved', async () => {
    mocks.actions.enqueue.mockRejectedValue(new Error('Durable storage unavailable; no action sent.'));
    render(<RewardsProvider><MountedCard /></RewardsProvider>);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Buy' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toContain('no action sent');
    expect(mocks.legacy).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain('"subPoints":30');
  });
  it('keeps Sub inventory and currency after a card becomes Dom, and uses that explicit inventory', async () => {
    mocks.actions.data.rewards[0].is_dom_reward = true;
    render(<RewardsProvider><MountedCard /></RewardsProvider>);
    expect((screen.getByRole('button', { name: 'Buy' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Sub owns 1')).toBeTruthy();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Use Sub reward' }));
    expect(mocks.actions.enqueue).toHaveBeenCalledWith({ kind: 'reward_redeem', rewardId: 'reward', inventoryCurrency: 'sub' });
    expect(screen.getByRole('status').textContent).toContain('"subRewardTypesCount":1');
    expect(screen.getByRole('status').textContent).toContain('"domRewardTypesCount":0');
  });
  it('offers Dom a zero-charge gift to Sub, while own-role Buy stays disabled', async () => {
    mocks.identity.currentRole = 'dom'; mocks.identity.participantId = 'dom-participant';
    render(<RewardsProvider><MountedCard /></RewardsProvider>);
    expect((screen.getByRole('button', { name: 'Buy' }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.setup().click(screen.getByRole('button', { name: /Gift to Sub/ }));
    expect(mocks.actions.enqueue).toHaveBeenCalledWith({ kind: 'reward_gift', rewardId: 'reward' });
    expect(screen.getByRole('status').textContent).toContain('"domPoints":50');
  });
  it('keeps unresolved commands visible and prevents another card action', () => {
    mocks.actions.entries = [{ command: { commandId: 'pending', kind: 'reward_buy' }, state: { status: 'confirmation_unknown' }, canReplay: true, canCancel: false, problem: { message: 'Server may have committed. Retry the same action.' } }];
    render(<RewardsProvider><MountedCard /><RewardActivity /></RewardsProvider>);
    expect((screen.getByRole('button', { name: 'Buy' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Confirmation unknown/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry same action' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancel unsent action' })).toBeNull();
  });
  it('shows the real Use dependency, permits its Undo, and preserves the purchase record', async () => {
    mocks.actions.data.lots = [lot({ status: 'redeemed', active_redemption_event_id: 'use' })];
    mocks.actions.data.events.push(event({ id: 'use', kind: 'reward_redeemed' }));
    render(<RewardsProvider><RewardActivity /></RewardsProvider>);
    await userEvent.setup().click(screen.getByText('Reward History'));
    expect(screen.getByText('Undo its Use event first.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Undo purchase' }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Undo Use' }));
    expect(mocks.actions.enqueue).toHaveBeenCalledWith({ kind: 'undo', eventId: 'use' });
    expect(screen.getByText('Purchased: Quiet evening')).toBeTruthy();
  });
  it('shows imported Use records as read-only evidence without inventing purchases, price, role or actor', async () => {
    mocks.actions.data.importedUsage = [
      { id: 'old-used', relationship_id: 'period', reward_id: 'reward', action_event_id: null, created_at: '2025-01-01T12:00:00Z', used: true, currentTitle: 'Renamed reward' },
      { id: 'old-false', relationship_id: 'period', reward_id: null, action_event_id: null, created_at: '2025-01-02T12:00:00Z', used: false },
      { id: 'old-unknown', relationship_id: 'period', reward_id: null, action_event_id: null, created_at: null, used: null },
    ];
    render(<RewardsProvider><RewardActivity /></RewardsProvider>);
    await userEvent.setup().click(screen.getByText('Reward History'));
    const imported = within(screen.getByRole('region', { name: 'Imported reward-use history' }));
    expect(imported.getAllByRole('article')).toHaveLength(3);
    expect(imported.getByText('Current title: Renamed reward')).toBeTruthy();
    expect(imported.getByText(/not historical snapshots/)).toBeTruthy();
    expect(imported.getByText('2025-01-01T12:00:00Z').getAttribute('dateTime')).toBe('2025-01-01T12:00:00Z');
    expect(imported.getByText('Saved status: Used')).toBeTruthy();expect(imported.getByText('Saved status: Not marked used')).toBeTruthy();
    expect(imported.getByText('Saved status: Not recorded')).toBeTruthy();expect(imported.getByText('Saved timestamp: Not recorded')).toBeTruthy();
    expect(imported.queryByRole('button')).toBeNull();expect(imported.queryByText(/Sub reward|Dom reward|Sub balance|Dom balance|Purchased:/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Undo purchase' })).toBeTruthy();
    expect(mocks.actions.enqueue).not.toHaveBeenCalled();
  });
  it('shows unknown balances as dashes until the scoped reward state is loaded', () => {
    mocks.actions.mode = 'loading';
    render(<RewardsProvider><PointsBubbles /></RewardsProvider>);
    expect(screen.getAllByText('—')).toHaveLength(4);
    expect(screen.queryByText('0')).toBeNull();
    expect(mocks.legacy).not.toHaveBeenCalled();
  });
  it('retains the disabled period legacy provider and legacy bubble behavior', () => {
    mocks.actions.mode = 'legacy';
    mocks.legacy.mockReturnValue({ rewards: [{ ...reward, supply: 4 }], totalPoints: 9, domPoints: 8, totalRewardsSupply: 99, totalDomRewardsSupply: 99, isLoading: false });
    render(<RewardsProvider><Balances /></RewardsProvider>);
    expect(mocks.legacy).toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain('"subPoints":9');
    expect(screen.getByRole('status').textContent).toContain('"subRewardTypesCount":4');
    expect(mocks.actions.enqueue).not.toHaveBeenCalled();
  });
});
