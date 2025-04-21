
import React from 'react';
import { Card } from '@/components/ui/card';
import RewardHeader from '@/components/rewards/RewardHeader';
import RewardContent from '@/components/rewards/RewardContent';
import RewardFooter from '@/components/rewards/RewardFooter';
import { useToast } from '@/hooks/use-toast';

interface RewardCardProps {
  title: string;
  description: string;
  cost: number;
  supply: number;
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

  const cardBorderStyle = supply > 0 
    ? {
        borderColor: '#FEF7CD',
        boxShadow: '0 0 8px 2px rgba(254, 247, 205, 0.6)'
      } 
    : {};

  return (
    <Card 
      className="relative overflow-hidden border-2 border-[#00f0ff] bg-navy z-0"
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
