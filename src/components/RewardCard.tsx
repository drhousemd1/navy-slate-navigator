import { blocksNewAction } from '@/data/actions/contracts';

import React, { useState } from 'react';
import { Card } from './ui/card';
import RewardHeader from './rewards/RewardHeader';
import RewardContent from './rewards/RewardContent';
import RewardFooter from './rewards/RewardFooter';
import { Reward } from '@/data/rewards/types';
import { useRewardUsageQuery } from '@/data/rewards/queries/useRewardUsageQuery';
import { useActionCommands } from '@/contexts/ActionCommandsContext';
import { useUserIds } from '@/contexts/UserIdsContext';
import { useRewards } from '@/contexts/RewardsContext';
import { rewardInventory } from '@/data/rewards/actionReadModel';

interface RewardCardProps {
  reward: Reward;
  onEdit?: () => void;
  handleBuyReward?: (rewardId: string, cost: number) => void;
  handleUseReward?: (rewardId: string) => void;
}

const RewardCard: React.FC<RewardCardProps> = ({
  reward,
  onEdit,
  handleBuyReward,
  handleUseReward
}) => {
  const actions = useActionCommands();
  const identity = useUserIds();
  const rewardsContext = useRewards();
  const atomic = actions.mode === 'atomic';
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const busy = saving || actions.entries.some(entry => blocksNewAction(entry, actions.scope));
  const inventory = rewardInventory(actions.data?.lots ?? [], reward.id);
  const usableInventory = inventory.filter(item => item.currency === 'dom'
    ? identity.currentRole === 'dom'
    : ['both', identity.currentRole].includes(identity.permissions?.sub_reward_redeem));
  const perform = async (operation: () => Promise<void>) => {
    setActionError(null); setSaving(true);
    try { await operation(); } catch (error) { setActionError(error instanceof Error ? error.message : 'Action could not be saved.'); }
    finally { setSaving(false); }
  };
  
  // Fetch actual usage data for this reward
  const { data: usageData = Array(7).fill(false) } = useRewardUsageQuery(reward.id, !atomic);
  const atomicUsage = Array(7).fill(false);
  for (const event of actions.data?.events ?? []) {
    if (event.reward_id !== reward.id || event.kind !== 'reward_redeemed' || !event.calendar || actions.data?.events.some(item => item.reverses_event_id === event.id)) continue;
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: event.calendar.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const week = new Date(`${today}T12:00:00Z`);
    week.setUTCDate(week.getUTCDate() - (week.getUTCDay() + 6) % 7);
    if (event.calendar.weekStartDate === week.toISOString().slice(0, 10)) atomicUsage[(new Date(`${event.calendar.localDate}T12:00:00Z`).getUTCDay() + 6) % 7] = true;
  }
  
  // Extract all properties from reward object
  const {
    id,
    title,
    description = "",
    cost,
    supply: savedSupply,
    is_dom_reward = false,
    icon_name = 'Gift',
    icon_color = '#9b87f5',
    background_image_url: backgroundImage,
    background_opacity = 100,
    focal_point_x = 50,
    focal_point_y = 50,
    highlight_effect = false,
    title_color = '#FFFFFF',
    subtext_color = '#8E9196',
    calendar_color = '#7E69AB',
  } = reward;
  const supply = atomic ? inventory.reduce((total, item) => total + item.quantity, 0) : savedSupply;

  const handleBuy = () => {
    if (atomic) { void perform(() => rewardsContext.handleBuyReward(reward.id, reward.cost)); return; }
    if (handleBuyReward && id) {
      handleBuyReward(id, cost);
    }
  };

  const handleUse = () => {
    if (atomic) {
      if (!busy && usableInventory.length === 1) void perform(() => rewardsContext.handleUseReward(reward.id, usableInventory[0].currency));
      return;
    }
    if (handleUseReward && id) {
      handleUseReward(id);
    }
  };

  // Define border color based on if it's a dom reward and if there's supply
  const cardBorderColor = is_dom_reward 
    ? "#ea384c" // Red for dom rewards
    : (supply > 0 ? "#FEF7CD" : "#00f0ff"); // Yellow for sub rewards with supply, blue otherwise
  
  const cardBorderStyle = {
    borderColor: cardBorderColor,
    boxShadow: supply > 0 ? `0 0 8px 2px rgba(${is_dom_reward ? '234, 56, 76, 0.6' : '254, 247, 205, 0.6'})` : undefined,
    backgroundColor: '#000000' // Adding black background as requested
  };

  return (
    <Card 
      className="relative overflow-hidden border-2 bg-navy z-0"
      style={cardBorderStyle}
    >
      {backgroundImage && (
        <div 
          className="absolute inset-0 z-0" 
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: `${focal_point_x}% ${focal_point_y}%`,
            opacity: background_opacity / 100,
          }}
        />
      )}
      <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
        <RewardHeader
          title={title}
          supply={supply}
          cost={cost}
          isDomReward={is_dom_reward}
          onBuy={handleBuy}
          onUse={handleUse}
          useDisabled={atomic && (busy || usableInventory.length === 0 || !actions.data)}
          useOptions={atomic && usableInventory.length > 1 ? usableInventory.map(item => ({
            label: `${item.currency === 'dom' ? 'Dom' : 'Sub'} reward`,
            onSelect: () => { if (!busy) void perform(() => rewardsContext.handleUseReward(reward.id, item.currency)); },
          })) : undefined}
          buyDisabled={atomic && (busy || identity.currentRole !== (is_dom_reward ? 'dom' : 'sub') || !actions.data)}
          onGift={atomic && identity.currentRole === 'dom' && !is_dom_reward && actions.data?.wallets.some(wallet => wallet.currency === 'sub')
            ? () => { if (!busy) void perform(() => rewardsContext.handleGiftReward(reward.id)); } : undefined}
          giftDisabled={busy}
        />
        {atomic && actionError && <p role="alert" className="mb-3 text-sm text-amber-300">{actionError}</p>}
        
        <RewardContent
          title={title}
          description={description}
          iconName={icon_name}
          iconColor={icon_color}
          highlight_effect={highlight_effect}
          title_color={title_color}
          subtext_color={subtext_color}
        />
        
        <RewardFooter
          usageData={atomic ? atomicUsage : usageData}
          calendarColor={calendar_color}
          onEdit={atomic && !['both', identity.currentRole].includes(identity.permissions?.definition_manage) ? undefined : onEdit}
        />
      </div>
    </Card>
  );
};

export default RewardCard;
