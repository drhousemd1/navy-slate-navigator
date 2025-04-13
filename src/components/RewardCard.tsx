import React from 'react';
import { Reward } from '@/lib/rewardUtils';
import useRewardImageCarousel from '@/contexts/rewards/hooks/useRewardImageCarousel';
import { Card } from './ui/card';
import RewardHeader from './rewards/RewardHeader';
import RewardContent from './rewards/RewardContent';
import RewardFooter from './rewards/RewardFooter';
import { useToast } from '../hooks/use-toast';

interface RewardCardProps {
  reward: Reward;
  onEdit: () => void;
  carouselIndex: number;
}

const RewardCard: React.FC<RewardCardProps> = ({ reward, onEdit, carouselIndex }) => {
  const { toast } = useToast();
  const { backgroundUrl, fadeStage } = useRewardImageCarousel(reward, carouselIndex);

  const handleBuy = (cost: number) => {
    if (reward.cost) {
      toast({
        title: "Buying is not yet implemented",
        description: `Buying ${reward.title} for ${reward.cost} is not yet implemented.`,
      });
    }
  };

  const handleUse = () => {
    toast({
      title: "Using is not yet implemented",
      description: `Using ${reward.title} is not yet implemented.`,
    });
  };

  const handleEdit = () => {
    onEdit();
  };

  const cardBorderStyle = reward.supply > 0 
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
      <div 
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-500 ${fadeStage === 'fade-in' ? 'opacity-100' : 'opacity-0'} z-0`}
        style={{ 
          backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'none',
          backgroundPosition: `${reward.focal_point_x || 50}% ${reward.focal_point_y || 50}%`,
          opacity: (reward.background_opacity || 100) / 100,
        }}
      />
      
      <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
        <RewardHeader
          title={reward.title}
          supply={reward.supply}
          cost={reward.cost}
          onBuy={handleBuy}
          onUse={handleUse}
        />
        
        <RewardContent
          title={reward.title}
          description={reward.description || ''}
          iconName={reward.icon_name}
          iconColor={reward.icon_color}
          highlight_effect={reward.highlight_effect}
          title_color={reward.title_color}
          subtext_color={reward.subtext_color}
        />
        
        <RewardFooter
          usageData={Array(7).fill(false)}
          calendarColor={reward.calendar_color || '#7E69AB'}
          onEdit={handleEdit}
        />
      </div>
    </Card>
  );
};

export default RewardCard;
