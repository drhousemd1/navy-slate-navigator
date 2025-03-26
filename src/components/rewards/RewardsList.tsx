
import React from 'react';
import RewardCard from '../RewardCard';
import { useRewards } from '../../contexts/RewardsContext';
import { Skeleton } from '../ui/skeleton';

interface RewardsListProps {
  onEdit: (index: number) => void;
}

const RewardsList: React.FC<RewardsListProps> = ({ onEdit }) => {
  const { rewards, handleBuy, handleUse, getRewardUsage, getFrequencyCount, loading } = useRewards();

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-40 w-full rounded-lg bg-gray-700" />
        ))}
      </div>
    );
  }

  if (rewards.length === 0) {
    return (
      <div className="text-white text-center p-8 bg-navy rounded-lg border border-light-navy">
        <p className="text-xl">No rewards found.</p>
        <p className="text-gray-400 mt-2">Create your first reward using the "+" button!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rewards.map((reward, index) => (
        <RewardCard
          key={index}
          title={reward.title}
          description={reward.description}
          cost={reward.cost}
          supply={reward.supply}
          iconName={reward.iconName}
          iconColor={reward.icon_color || "#9b87f5"}
          onBuy={() => handleBuy(index)}
          onUse={() => handleUse(index)}
          onEdit={() => onEdit(index)}
          backgroundImage={reward.background_image_url}
          backgroundOpacity={reward.background_opacity}
          focalPointX={reward.focal_point_x}
          focalPointY={reward.focal_point_y}
          highlight_effect={reward.highlight_effect}
          title_color={reward.title_color}
          subtext_color={reward.subtext_color}
          calendar_color={reward.calendar_color}
          usageData={getRewardUsage(index)}
          frequencyCount={getFrequencyCount(index)}
        />
      ))}
    </div>
  );
};

export default RewardsList;
