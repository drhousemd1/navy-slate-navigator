
import React, { useEffect } from 'react';
import RewardCard from '../RewardCard';
import { useRewards } from '../../contexts/RewardsContext';

interface RewardsListProps {
  onEdit: (index: number) => void;
}

const RewardsList: React.FC<RewardsListProps> = ({ onEdit }) => {
  const { rewards, handleBuy, handleUse, getRewardUsage, getFrequencyCount } = useRewards();

  // Add invisible button for adding new rewards via custom event
  useEffect(() => {
    // Create the button if it doesn't exist
    if (!document.getElementById('add-new-reward-button')) {
      const button = document.createElement('button');
      button.id = 'add-new-reward-button';
      button.style.display = 'none';
      button.setAttribute('aria-hidden', 'true');
      document.body.appendChild(button);
    }
    
    return () => {
      // Clean up on unmount
      const button = document.getElementById('add-new-reward-button');
      if (button) {
        document.body.removeChild(button);
      }
    };
  }, []);

  console.log('Current rewards in RewardsList:', rewards);

  return (
    <div className="space-y-4">
      {rewards.map((reward, index) => (
        <RewardCard
          key={reward.id || index}
          title={reward.title}
          description={reward.description || ''}
          cost={reward.cost}
          supply={reward.supply}
          iconName={reward.iconName}
          iconColor={reward.icon_color || "#9b87f5"}
          onBuy={() => handleBuy(index)}
          onUse={() => handleUse(index)}
          onEdit={() => onEdit(index)}
          backgroundImage={reward.background_image_url}
          backgroundOpacity={reward.background_opacity || 100}
          focalPointX={reward.focal_point_x || 50}
          focalPointY={reward.focal_point_y || 50}
          highlight_effect={reward.highlight_effect || false}
          title_color={reward.title_color || "#FFFFFF"}
          subtext_color={reward.subtext_color || "#8E9196"}
          calendar_color={reward.calendar_color || "#7E69AB"}
          usageData={getRewardUsage(index)}
          frequencyCount={getFrequencyCount(index)}
        />
      ))}
    </div>
  );
};

export default RewardsList;
