
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Reward } from '@/data/rewards/types'; 
import { Badge } from '@/components/ui/badge';
import { useRewards } from '@/contexts/RewardsContext';
import { cn } from '@/lib/utils';
import { Crown, Coins, Box, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';
import { useRewardUsageQuery } from '@/data/rewards/queries/useRewardUsageQuery';
import WeeklyUsageTracker from './WeeklyUsageTracker';

interface RewardCardProps {
  reward: Reward;
  onEdit?: () => void;
}

const RewardCard: React.FC<RewardCardProps> = ({ reward, onEdit }) => {
  const { handleBuyReward, handleUseReward, totalPoints, domPoints } = useRewards();
  const [buying, setBuying] = React.useState(false);
  const [using, setUsing] = React.useState(false);
  
  // Fetch usage data for this reward
  const { data: usageData = Array(7).fill(false) } = useRewardUsageQuery(reward.id);
  
  // Explicitly enforce boolean type for is_dom_reward
  const isDomReward = Boolean(reward.is_dom_reward);
  
  // Use appropriate points based on reward type
  const currentPoints = isDomReward ? domPoints : totalPoints;
  const canAfford = currentPoints >= reward.cost;
  const hasAvailable = reward.supply > 0;

  const handleBuyClick = async () => {
    if (buying) return; // Prevent multiple clicks
    
    try {
      setBuying(true);
      // Pass the isDomReward flag explicitly to ensure it's handled correctly
      await handleBuyReward(reward.id, reward.cost, isDomReward);
    } catch (error) {
      logger.error('Error buying reward:', error);
    } finally {
      // Set buying false after a short delay to prevent multiple clicks
      setTimeout(() => setBuying(false), 500);
    }
  };

  const handleUseClick = async () => {
    if (using) return; // Prevent multiple clicks
    
    try {
      setUsing(true);
      await handleUseReward(reward.id);
    } catch (error) {
      logger.error('Error using reward:', error);
    } finally {
      // Set using false after a short delay to prevent multiple clicks
      setTimeout(() => setUsing(false), 500);
    }
  };

  // Get background style with focal points and opacity
  const getBgStyle = () => {
    if (!reward.background_image_url) return {};
    
    return {
      backgroundImage: `url(${reward.background_image_url})`,
      backgroundSize: 'cover',
      backgroundPosition: `${reward.focal_point_x || 50}% ${reward.focal_point_y || 50}%`,
      opacity: reward.background_opacity / 100,
    };
  };

  // Define styles based on if it's a dom reward
  const costBadgeColor = isDomReward ? "bg-red-600" : "bg-nav-active";
  const buyButtonColor = isDomReward 
    ? "bg-red-600 hover:bg-red-700" 
    : "bg-nav-active hover:bg-nav-active/80";

  // Define border color based on if it's a dom reward and if there's supply
  const cardBorderColor = isDomReward 
    ? "#ea384c" // Red for dom rewards
    : (hasAvailable ? "#FEF7CD" : "#00f0ff"); // Yellow for sub rewards with supply, blue otherwise
  
  const cardBorderStyle = {
    borderColor: cardBorderColor,
    boxShadow: hasAvailable ? `0 0 8px 2px rgba(${isDomReward ? '234, 56, 76, 0.6' : '254, 247, 205, 0.6'})` : undefined
  };

  // Define supply badge color based on if it's a dom reward
  const supplyBadgeColor = isDomReward ? "bg-red-500" : "bg-blue-500";

  return (
    <Card className="relative overflow-hidden bg-dark-navy border-2 border-light-navy text-white"
          style={cardBorderStyle}>
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
              className="text-sm font-medium rounded-full px-3 py-1 mt-1 flex items-center" 
              style={{ backgroundColor: isDomReward ? "#ea384c" : (reward.calendar_color || '#7E69AB') }}
            >
              {isDomReward ? (
                <Crown className="h-3 w-3 mr-1" />
              ) : (
                <Coins className="h-3 w-3 mr-1" />
              )}
              {reward.cost} pts
            </div>
          </div>
        </div>
        
        <div className="mt-auto pt-4 flex justify-between items-center">
          <div className="flex items-center">
            <Badge className={`${supplyBadgeColor} text-white font-bold flex items-center gap-1`}>
              <Box className="h-3 w-3" />
              <span>{reward.supply}</span>
            </Badge>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasAvailable || using}
              onClick={handleUseClick}
              className="border-light-navy hover:bg-light-navy min-w-[60px]"
            >
              {using ? (
                <span className="flex items-center">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  <span>...</span>
                </span>
              ) : "Use"}
            </Button>
            
            <Button
              size="sm"
              disabled={!canAfford || buying}
              onClick={handleBuyClick}
              className={`${canAfford ? buyButtonColor : 'bg-dark-navy text-light-navy'} min-w-[60px]`}
            >
              {buying ? (
                <span className="flex items-center">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  <span>...</span>
                </span>
              ) : "Buy"}
            </Button>
          </div>
        </div>

        {/* Weekly Usage Tracker */}
        <div className="mt-4">
          <WeeklyUsageTracker 
            usageData={usageData}
            calendarColor={reward.calendar_color || '#7E69AB'}
          />
        </div>
      </div>
    </Card>
  );
};

export default RewardCard;
