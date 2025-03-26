
import React from 'react';
import RewardCard from '../RewardCard';
import { useRewards } from '../../contexts/RewardsContext';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';

interface RewardsListProps {
  onEdit: (index: number) => void;
  onAddNewItem?: () => void;
}

const RewardsList: React.FC<RewardsListProps> = ({ onEdit, onAddNewItem }) => {
  const { rewards, handleBuy, handleUse, getRewardUsage, getFrequencyCount } = useRewards();

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
      
      {onAddNewItem && (
        <div className="flex justify-center mt-6 pb-12">
          <Button 
            onClick={onAddNewItem}
            className="bg-navy border border-light-navy text-nav-active rounded-full w-12 h-12 p-0 shadow-lg hover:bg-light-navy hover:shadow-xl transition-all"
            aria-label="Add New Reward"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default RewardsList;
