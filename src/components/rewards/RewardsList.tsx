
import React, { useEffect } from 'react';
import RewardCard from '../RewardCard';
import { useRewards } from '../../contexts/RewardsContext';

interface RewardsListProps {
  onEdit: (index: number) => void;
}

const RewardsList: React.FC<RewardsListProps> = ({ onEdit }) => {
  const { rewards, handleBuy, handleUse, getRewardUsage, getFrequencyCount, isLoading, refetchRewards } = useRewards();

  // Ensure rewards data is fresh when component mounts
  useEffect(() => {
    console.log("RewardsList mounted, refreshing data if needed");
    refetchRewards();
  }, [refetchRewards]);

  if (isLoading && !rewards.length) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className="bg-navy border border-light-navy rounded-lg p-4 animate-pulse h-32"
          />
        ))}
      </div>
    );
  }

  // The rewards array is already sorted by created_at in the API call
  // No additional sorting needed here
  return (
    <div className="space-y-4">
      {rewards.map((reward, index) => (
        <RewardCard
          key={reward.id || index}
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
