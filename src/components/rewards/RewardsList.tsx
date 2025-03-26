
import React from 'react';
import { useRewards } from '../../contexts/RewardsContext';
import RewardCard from '../RewardCard';
import { Grid } from '../ui/grid';

interface RewardsListProps {
  onEdit: (index: number) => void;
}

const RewardsList: React.FC<RewardsListProps> = ({ onEdit }) => {
  const { rewards, handleBuyReward, handleUseReward } = useRewards();
  
  if (!rewards || rewards.length === 0) {
    return (
      <div className="text-center p-10">
        <p className="text-light-navy mb-4">You don't have any rewards yet.</p>
        <p className="text-light-navy">Click the + button to create your first reward!</p>
      </div>
    );
  }

  // Log rewards for debugging
  console.log("Rendering RewardsList with rewards:", 
    rewards.map(r => ({ id: r.id, title: r.title, created_at: r.created_at }))
  );

  return (
    <Grid className="gap-4 md:grid-cols-2 lg:grid-cols-3">
      {rewards.map((reward, index) => (
        <RewardCard
          key={reward.id}
          title={reward.title}
          description={reward.description || ''}
          cost={reward.cost}
          supply={reward.supply}
          iconName={reward.icon_name}
          iconColor={reward.icon_color}
          onBuy={() => handleBuyReward(reward.id)}
          onUse={() => handleUseReward(reward.id)}
          onEdit={() => onEdit(index)}
          backgroundImage={reward.background_image_url}
          backgroundOpacity={reward.background_opacity}
          focalPointX={reward.focal_point_x}
          focalPointY={reward.focal_point_y}
          highlight_effect={reward.highlight_effect}
          title_color={reward.title_color}
          subtext_color={reward.subtext_color}
          calendar_color={reward.calendar_color}
        />
      ))}
    </Grid>
  );
};

export default RewardsList;
