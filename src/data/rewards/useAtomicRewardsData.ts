import { useEffect, useRef } from 'react';
import { useActionCommands } from '@/contexts/ActionCommandsContext';
import { useUserIds } from '@/contexts/UserIdsContext';
import { supabase } from '@/integrations/supabase/client';
import { actionScopeToken, assertCurrentActionScope } from './actionReadModel';
import { scopeKey } from '@/data/actions/contracts';
import type { Reward } from './types';
import type { Currency } from '@/domain/actions/types';
import type { QueryObserverResult } from '@tanstack/react-query';

const editableFields = ['title', 'description', 'cost', 'is_dom_reward', 'background_image_url', 'background_opacity', 'icon_name', 'icon_color', 'title_color', 'subtext_color', 'calendar_color', 'highlight_effect', 'focal_point_x', 'focal_point_y', 'image_meta'] as const;
export function useAtomicRewardsData() {
  const actions = useActionCommands();
  const identity = useUserIds();
  const currentKey = actions.scope ? scopeKey(actions.scope) : null;
  const current = useRef(currentKey); current.current = currentKey;
  useEffect(() => { current.current = currentKey; return () => { current.current = null; }; }, [currentKey]);
  const rewards = actions.data?.rewards ?? [];
  const saveReward = async ({ rewardData }: { rewardData: Partial<Reward>; currentIndex: number | null }): Promise<Reward> => {
    const scope = actions.scope;
    if (!scope || !actions.data || !['both', identity.currentRole].includes(identity.permissions?.definition_manage)) throw new Error('Reward editing is unavailable for your current relationship permission.');
    const expectedKey = scopeKey(scope);
    const token = await actionScopeToken(scope);
    if (expectedKey !== current.current) throw new Error('Your relationship changed. Reopen the reward before saving.');
    const values = Object.fromEntries(editableFields.filter(field => field in rewardData).map(field => [field, rewardData[field]]));
    const db = supabase as any;
    const request = rewardData.id
      ? db.from('rewards').update(values).eq('id', rewardData.id).eq('relationship_id', scope.relationshipId).is('deleted_at', null)
      : db.from('rewards').insert({ ...values, user_id: scope.accountId, relationship_id: scope.relationshipId, supply: 0 });
    const { data, error } = await request.select('*').single().setHeader('Authorization', `Bearer ${token}`).setHeader('x-relationship-session-id', scope.relationshipSessionId);
    if (error || !data || data.relationship_id !== scope.relationshipId) throw new Error(error?.message || 'Reward changes were not confirmed.');
    await assertCurrentActionScope(scope, token);
    if (expectedKey !== current.current) throw new Error('Your relationship changed. Reload the current rewards.');
    await actions.refresh();
    if (expectedKey !== current.current) throw new Error('Your relationship changed. Reload the current rewards.');
    return data as Reward;
  };
  const forbidAbsoluteBalance = async () => { throw new Error('Balances change through recorded actions. Direct replacement is unavailable.'); };
  return {
    rewards, atomicAccounting: true,
    totalPoints: actions.data?.wallets.find(wallet => wallet.currency === 'sub')?.balance ?? 0,
    domPoints: actions.data?.wallets.find(wallet => wallet.currency === 'dom')?.balance ?? 0,
    totalRewardsSupply: actions.data?.lots.filter(lot => lot.status === 'available' && lot.currency === 'sub').length ?? 0,
    totalDomRewardsSupply: actions.data?.lots.filter(lot => lot.status === 'available' && lot.currency === 'dom').length ?? 0,
    isLoading: !actions.data, error: actions.error, saveReward,
    deleteReward: (rewardId: string) => actions.enqueue({ kind: 'reward_delete', rewardId }),
    buyReward: ({ rewardId, cost }: { rewardId: string; cost: number; isDomReward: boolean }) => actions.enqueue({ kind: 'reward_buy', rewardId, expectedCost: cost }),
    useReward: ({ rewardId, inventoryCurrency }: { rewardId: string; inventoryCurrency?: Currency }) => actions.enqueue({ kind: 'reward_redeem', rewardId, inventoryCurrency }),
    giftReward: (rewardId: string) => actions.enqueue({ kind: 'reward_gift', rewardId }),
    updatePoints: forbidAbsoluteBalance, updateDomPoints: forbidAbsoluteBalance,
    refetchRewards: async () => { await actions.refresh(); return { data: rewards } as QueryObserverResult<Reward[], Error>; },
    refreshPointsFromDatabase: actions.refresh,
  };
}
