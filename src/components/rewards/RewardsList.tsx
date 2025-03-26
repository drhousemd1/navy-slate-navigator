
import React, { useEffect } from 'react';
import RewardCard from '../RewardCard';
import { useRewards } from '../../contexts/RewardsContext';
import { Skeleton } from '../ui/skeleton';

interface RewardsListProps {
  onEdit: (index: number) => void;
}

const RewardsList: React.FC<RewardsListProps> = ({ onEdit }) => {
  const { rewards, handleBuy, handleUse, getRewardUsage, getFrequencyCount, isLoading } = useRewards();

  // Debug logging
  useEffect(() => {
    console.log('RewardsList rendering with:', { isLoading, rewardsCount: rewards.length });
    if (rewards.length > 0) {
      console.log('First reward:', rewards[0]);
    }
  }, [isLoading, rewards]);

  if (isLoading) {
    console.log('Showing loading skeletons...');
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((_, index) => (
          <div key={index} className="rounded-lg overflow-hidden border-2 border-[#00f0ff] bg-navy p-4">
            <div className="flex justify-between items-start mb-3">
              <Skeleton className="h-6 w-16" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
            <div className="flex items-start mb-auto">
              <Skeleton className="h-10 w-10 rounded-full mr-4" />
              <div className="flex-1">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <div className="mt-4 flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (rewards.length === 0) {
    console.log('No rewards found, showing empty state message');
    return (
      <div className="text-center py-10">
        <p className="text-white text-lg">No rewards found. Create your first reward!</p>
      </div>
    );
  }

  console.log(`Rendering ${rewards.length} reward cards`);
  return (
    <div className="space-y-4">
      {rewards.map((reward, index) => {
        // Additional validation before rendering
        if (!reward || !reward.id || !reward.title) {
          console.error(`Invalid reward at index ${index}:`, reward);
          return null;
        }
        
        return (
          <RewardCard
            key={reward.id}
            title={reward.title}
            description={reward.description || ''}
            cost={reward.cost}
            supply={reward.supply || 0}
            iconName={reward.iconName}
            icon_name={reward.icon_name}
            icon_color={reward.icon_color}
            onBuy={() => handleBuy(index)}
            onUse={() => handleUse(index)}
            onEdit={() => onEdit(index)}
            background_image_url={reward.background_image_url}
            background_opacity={reward.background_opacity}
            focal_point_x={reward.focal_point_x}
            focal_point_y={reward.focal_point_y}
            highlight_effect={reward.highlight_effect}
            title_color={reward.title_color}
            subtext_color={reward.subtext_color}
            calendar_color={reward.calendar_color}
            usageData={getRewardUsage(index)}
            frequencyCount={getFrequencyCount(index)}
          />
        );
      })}
    </div>
  );
};

export default RewardsList;
