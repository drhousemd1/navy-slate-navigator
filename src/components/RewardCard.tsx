
import React from 'react';
import { Card } from './ui/card';
import RewardHeader from './rewards/RewardHeader';
import RewardContent from './rewards/RewardContent';
import RewardFooter from './rewards/RewardFooter';
import { useToast } from '../hooks/use-toast';
import { Reward } from '@/data/rewards/types';
import { useRewardUsageQuery } from '@/data/rewards/queries/useRewardUsageQuery';

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
  const { toast } = useToast();
  
  // Fetch actual usage data for this reward
  const { data: usageData = Array(7).fill(false) } = useRewardUsageQuery(reward.id);
  
  // Extract all properties from reward object
  const {
    id,
    title,
    description = "",
    cost,
    supply,
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

  const handleBuy = () => {
    if (handleBuyReward && id) {
      handleBuyReward(id, cost);
    }
  };

  const handleUse = () => {
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
        />
        
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
          usageData={usageData}
          calendarColor={calendar_color}
          onEdit={onEdit}
        />
      </div>
    </Card>
  );
};

export default RewardCard;
