
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Reward } from '@/lib/rewardUtils';
import { Badge } from '@/components/ui/badge';
import { useRewards } from '@/contexts/RewardsContext';
import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';

interface RewardCardProps {
  reward: Reward;
  onEdit?: () => void;
}

const RewardCard: React.FC<RewardCardProps> = ({ reward, onEdit }) => {
  const { handleBuyReward, handleUseReward, totalPoints, domPoints } = useRewards();
  const [buying, setBuying] = React.useState(false);
  const [using, setUsing] = React.useState(false);
  
  const isDomReward = Boolean(reward.is_dom_reward);
  const currentPoints = isDomReward ? domPoints : totalPoints;
  const canAfford = currentPoints >= reward.cost;
  const hasAvailable = reward.supply > 0;

  const handleBuyClick = async () => {
    try {
      setBuying(true);
      // Pass the isDomReward flag explicitly to ensure it's handled correctly
      await handleBuyReward(reward.id, reward.cost, isDomReward);
    } catch (error) {
      console.error('Error buying reward:', error);
    } finally {
      setBuying(false);
    }
  };

  const handleUseClick = async () => {
    try {
      setUsing(true);
      await handleUseReward(reward.id);
    } catch (error) {
      console.error('Error using reward:', error);
    } finally {
      setUsing(false);
    }
  };

  // Calculate background style with focal points and opacity
  const getBgStyle = () => {
    if (!reward.background_image_url) return {};
    
    return {
      backgroundImage: `url(${reward.background_image_url})`,
      backgroundSize: 'cover',
      backgroundPosition: `${reward.focal_point_x || 50}% ${reward.focal_point_y || 50}%`,
      opacity: reward.background_opacity / 100,
    };
  };

  return (
    <Card className="relative overflow-hidden bg-dark-navy border-light-navy text-white">
      {/* Background image with opacity */}
      {reward.background_image_url && (
        <div 
          className="absolute inset-0 z-0" 
          style={getBgStyle()}
        />
      )}
      
      {/* Card content */}
      <div className="relative z-10 p-4 flex flex-col h-full">
        <div className="flex justify-between items-start">
          <div>
            {isDomReward && (
              <div className="mb-2">
                <Badge variant="outline" className="bg-amber-800/80 text-amber-200 border-amber-500 flex items-center space-x-1">
                  <Crown className="h-3 w-3 mr-1" />
                  <span>Dom Reward</span>
                </Badge>
              </div>
            )}
            
            <h3 className={cn(
              "text-lg font-semibold",
              reward.highlight_effect && "bg-yellow-300/30 px-2 py-1 rounded",
            )}
            style={{ color: reward.title_color }}>
              {reward.title}
            </h3>
            
            {reward.description && (
              <p className={cn(
                "text-sm mt-1",
                reward.highlight_effect && "bg-yellow-300/20 px-2 py-1 rounded",
              )}
              style={{ color: reward.subtext_color }}>
                {reward.description}
              </p>
            )}
          </div>
          
          <div className="flex flex-col items-end">
            {onEdit && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onEdit}
                className="h-8 px-2 text-light-navy hover:text-white hover:bg-light-navy"
              >
                Edit
              </Button>
            )}
            
            <div 
              className="text-sm font-medium rounded-full px-3 py-1 mt-1" 
              style={{ backgroundColor: reward.calendar_color || '#7E69AB' }}
            >
              {reward.cost} pts
            </div>
          </div>
        </div>
        
        <div className="mt-auto pt-4 flex justify-between items-center">
          <div className="text-sm text-light-navy">
            Available: {reward.supply}
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasAvailable || using}
              onClick={handleUseClick}
              className="border-light-navy hover:bg-light-navy"
            >
              {using ? "Using..." : "Use"}
            </Button>
            
            <Button
              size="sm"
              disabled={!canAfford || buying}
              onClick={handleBuyClick}
              className={`${canAfford ? 'bg-nav-active hover:bg-nav-active/80' : 'bg-dark-navy text-light-navy'}`}
            >
              {buying ? "Buying..." : "Buy"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RewardCard;
