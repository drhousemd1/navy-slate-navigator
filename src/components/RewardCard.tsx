
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
  iconName?: string;
  icon_name?: string;
  iconColor?: string;
  icon_color?: string;
  onBuy?: () => void;
  onUse?: () => void;
  onEdit?: () => void;
  backgroundImage?: string;
  background_image_url?: string;
  backgroundOpacity?: number;
  background_opacity?: number;
  focalPointX?: number;
  focal_point_x?: number;
  focalPointY?: number;
  focal_point_y?: number;
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
  iconName,
  icon_name,
  iconColor,
  icon_color = '#9b87f5',
  onBuy,
  onUse,
  onEdit,
  backgroundImage,
  background_image_url,
  backgroundOpacity,
  background_opacity = 100,
  focalPointX,
  focal_point_x = 50,
  focalPointY,
  focal_point_y = 50,
  highlight_effect = false,
  title_color = '#FFFFFF',
  subtext_color = '#8E9196',
  calendar_color = '#7E69AB',
  usageData = Array(7).fill(false)
}) => {
  const { toast } = useToast();
  
  // Handle both naming conventions
  const effectiveIconName = iconName || icon_name || 'Gift';
  const effectiveIconColor = iconColor || icon_color;
  const effectiveBackgroundImage = backgroundImage || background_image_url;
  const effectiveOpacity = backgroundOpacity || background_opacity;
  const effectiveFocalX = focalPointX || focal_point_x;
  const effectiveFocalY = focalPointY || focal_point_y;

  const handleBuy = () => {
    if (onBuy) {
      onBuy();
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

  const cardBorderStyle = supply > 0 
    ? {
        borderColor: '#FFD700',
        boxShadow: '0 0 8px 2px rgba(255, 215, 0, 0.6)'
      } 
    : {};

  return (
    <Card 
      className="relative overflow-hidden border-2 border-[#00f0ff] bg-navy"
      style={cardBorderStyle}
    >
      {effectiveBackgroundImage && (
        <div 
          className="absolute inset-0 z-0" 
          style={{
            backgroundImage: `url(${effectiveBackgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: `${effectiveFocalX}% ${effectiveFocalY}%`,
            opacity: effectiveOpacity / 100,
          }}
        />
      )}
      <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
        <RewardHeader
          title={title}
          supply={supply}
          cost={cost}
          onBuy={handleBuy}
          onUse={handleUse}
        />
        
        <RewardContent
          title={title}
          description={description}
          iconName={effectiveIconName}
          iconColor={effectiveIconColor}
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
