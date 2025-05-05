
import React from 'react';
import { Card } from './ui/card';
import RewardHeader from './rewards/RewardHeader';
import RewardContent from './rewards/RewardContent';
import RewardFooter from './rewards/RewardFooter';
import { useToast } from '../hooks/use-toast';

interface RewardCardProps {
  title: string;
  description: string;
  cost: number;
  supply: number;
  isDomReward?: boolean;
  iconName?: string;
  iconColor?: string;
  onBuy?: (cost: number) => void;
  onUse?: () => void;
  onEdit?: () => void;
  backgroundImage?: string | null;
  backgroundOpacity?: number;
  focalPointX?: number;
  focalPointY?: number;
  highlight_effect?: boolean;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  usageData?: boolean[];
  frequencyCount?: number;
}

const RewardCard: React.FC<RewardCardProps> = ({
  title,
  description,
  cost,
  supply,
  isDomReward = false,
  iconName = 'Gift',
  iconColor = '#9b87f5',
  onBuy,
  onUse,
  onEdit,
  backgroundImage,
  backgroundOpacity = 100,
  focalPointX = 50,
  focalPointY = 50,
  highlight_effect = false,
  title_color = '#FFFFFF',
  subtext_color = '#8E9196',
  calendar_color = '#7E69AB',
  usageData = Array(7).fill(false)
}) => {
  const { toast } = useToast();

  const handleBuy = (cost: number) => {
    if (onBuy) {
      onBuy(cost);
    }
  };

  const handleUse = () => {
    if (onUse) {
      onUse();
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    }
  };

  // Define border color based on if it's a dom reward and if there's supply
  const cardBorderColor = isDomReward 
    ? "#ea384c" // Red for dom rewards
    : (supply > 0 ? "#FEF7CD" : "#00f0ff"); // Yellow for sub rewards with supply, blue otherwise
  
  const cardBorderStyle = {
    borderColor: cardBorderColor,
    boxShadow: supply > 0 ? `0 0 8px 2px rgba(${isDomReward ? '234, 56, 76, 0.6' : '254, 247, 205, 0.6'})` : undefined
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
            backgroundPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: backgroundOpacity / 100,
          }}
        />
      )}
      <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
        <RewardHeader
          title={title}
          supply={supply}
          cost={cost}
          isDomReward={isDomReward}
          onBuy={handleBuy}
          onUse={handleUse}
        />
        
        <RewardContent
          title={title}
          description={description}
          iconName={iconName}
          iconColor={iconColor}
          highlight_effect={highlight_effect}
          title_color={title_color}
          subtext_color={subtext_color}
        />
        
        <RewardFooter
          usageData={usageData}
          calendarColor={calendar_color}
          onEdit={handleEdit}
        />
      </div>
    </Card>
  );
};

export default RewardCard;
