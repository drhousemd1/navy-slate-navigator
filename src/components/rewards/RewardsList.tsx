
import React from 'react';
import RewardCard from '../RewardCard';
import { useRewards } from '../../contexts/RewardsContext';
import { Skeleton } from '../ui/skeleton';

interface RewardsListProps {
  onEdit: (index: number) => void;
  filter?: 'all' | 'available' | 'unavailable';
}

const RewardsList: React.FC<RewardsListProps> = ({ onEdit, filter = 'all' }) => {
  const { rewards, handleBuy, handleUse, getRewardUsage, getFrequencyCount, loading } = useRewards();

  // Filter rewards based on the selected tab
  const filteredRewards = rewards.filter(reward => {
    if (filter === 'all') return true;
    if (filter === 'available') return reward.supply > 0;
    if (filter === 'unavailable') return reward.supply === 0;
    return true;
  });

  // Show loading skeleton while data is being fetched
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-40 w-full rounded-lg bg-gray-700" />
        ))}
      </div>
    );
  }

  // No rewards after filtering
  if (filteredRewards.length === 0) {
    return (
      <div className="text-white text-center p-8 bg-navy rounded-lg border border-light-navy">
        <p className="text-xl">No rewards found{filter !== 'all' ? ` in ${filter} tab` : ''}.</p>
        <p className="text-gray-400 mt-2">
          {filter === 'all' 
            ? 'Create your first reward using the "+" button!' 
            : filter === 'available' 
              ? 'Buy some rewards to see them here!' 
              : 'All your rewards are available.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredRewards.map((reward, index) => {
        // Find the original index in the full rewards array
        const originalIndex = rewards.findIndex(r => r.id === reward.id);
        
        return (
          <RewardCard
            key={reward.id || index}
            title={reward.title}
            description={reward.description}
            cost={reward.cost}
            supply={reward.supply}
            iconName={reward.iconName}
            iconColor={reward.icon_color || "#9b87f5"}
            onBuy={() => handleBuy(originalIndex)}
            onUse={() => handleUse(originalIndex)}
            onEdit={() => onEdit(originalIndex)}
            backgroundImage={reward.background_image_url}
            backgroundOpacity={reward.background_opacity}
            focalPointX={reward.focal_point_x}
            focalPointY={reward.focal_point_y}
            highlight_effect={reward.highlight_effect}
            title_color={reward.title_color}
            subtext_color={reward.subtext_color}
            calendar_color={reward.calendar_color}
            usageData={getRewardUsage(originalIndex)}
            frequencyCount={getFrequencyCount(originalIndex)}
          />
        );
      })}
    </div>
  );
};

export default RewardsList;
