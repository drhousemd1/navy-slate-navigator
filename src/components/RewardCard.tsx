
import React from 'react';
import { Reward } from '@/lib/rewardUtils';
import useRewardImageCarousel from '@/contexts/rewards/hooks/useRewardImageCarousel';

interface RewardCardProps {
  reward: Reward;
  onEdit: () => void;
  carouselIndex: number;
}

export const RewardCard: React.FC<RewardCardProps> = ({ reward, onEdit, carouselIndex }) => {
  const { backgroundUrl, fadeStage } = useRewardImageCarousel(reward, carouselIndex);

  return (
    <div className="relative" onClick={onEdit}>
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-500 ${fadeStage === 'fade-in' ? 'opacity-100' : 'opacity-0'}`}
        style={{ backgroundImage: `url(${backgroundUrl})` }}
      />
      <div className="relative z-10 p-4">
        <h2 className="text-xl font-bold">{reward.title}</h2>
        <p>{reward.description}</p>
      </div>
    </div>
  );
};

export default RewardCard;
