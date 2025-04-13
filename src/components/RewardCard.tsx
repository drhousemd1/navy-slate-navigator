
import React from 'react';
import { Reward } from '@/lib/rewardUtils';
import useRewardImageCarousel from '@/contexts/rewards/hooks/useRewardImageCarousel';
import { RewardHeader } from './rewards/RewardHeader';
import { RewardContent } from './rewards/RewardContent';
import { RewardFooter } from './rewards/RewardFooter';

interface RewardCardProps {
  reward: Reward;
  onEdit: () => void;
  carouselIndex: number;
  onBuy: () => Promise<void>;
  onUse: () => Promise<void>;
}

export const RewardCard: React.FC<RewardCardProps> = ({ 
  reward, 
  onEdit, 
  carouselIndex,
  onBuy,
  onUse
}) => {
  const { fadeStage } = useRewardImageCarousel(reward, carouselIndex);

  return (
    <div className="relative" onClick={onEdit}>
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-500 ${
          fadeStage === 'fade-in' ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundImage: `url(${reward.background_image_url || ''})` }}
      />
      <div className="relative z-10 flex flex-col p-4 rounded-lg bg-white/90 backdrop-blur">
        <RewardHeader 
          title={reward.title} 
          supply={reward.supply} 
          cost={reward.cost} 
          onBuy={onBuy} 
          onUse={onUse}
          iconName={reward.icon_name}
          iconColor={reward.icon_color}
        />
        <RewardContent 
          description={reward.description || ''} 
          supply={reward.supply} 
          cost={reward.cost} 
          iconName={reward.icon_name}
          iconColor={reward.icon_color}
          highlight_effect={reward.highlight_effect}
          title_color={reward.title_color}
          subtext_color={reward.subtext_color}
        />
        <RewardFooter onBuy={onBuy} onUse={onUse} />
      </div>
    </div>
  );
};

export default RewardCard;
