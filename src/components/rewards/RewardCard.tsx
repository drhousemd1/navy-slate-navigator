import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Reward } from '@/lib/rewardUtils';
import { Badge } from '@/components/ui/badge';
import { useRewards } from '@/contexts/RewardsContext';
import { cn } from '@/lib/utils';
import { Crown, Coins, Box, Loader2 } from 'lucide-react';

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
}

const RewardCard: React.FC<RewardCardProps> = ({ 
  title,
  description, 
  cost,
  supply,
  isDomReward = false,
  iconName,
  iconColor,
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
  const { handleBuyReward, handleUseReward, totalPoints, domPoints } = useRewards();
  const [buying, setBuying] = React.useState(false);
  const [using, setUsing] = React.useState(false);
  
  // Use appropriate points based on reward type
  const currentPoints = isDomReward ? domPoints : totalPoints;
  const canAfford = currentPoints >= cost;
  const hasAvailable = supply > 0;

  const handleBuyClick = async () => {
    if (buying) return; // Prevent multiple clicks
    
    try {
      setBuying(true);
      // Call onBuy prop if provided
      if (onBuy) {
        onBuy(cost);
      } else {
        // Otherwise use context function
        await handleBuyReward(title, cost, isDomReward);
      }
    } catch (error) {
      console.error('Error buying reward:', error);
    } finally {
      // Set buying false after a short delay to prevent multiple clicks
      setTimeout(() => setBuying(false), 500);
    }
  };

  const handleUseClick = async () => {
    if (using) return; // Prevent multiple clicks
    
    try {
      setUsing(true);
      // Call onUse prop if provided
      if (onUse) {
        onUse();
      } else {
        // Otherwise use context function
        await handleUseReward(title);
      }
    } catch (error) {
      console.error('Error using reward:', error);
    } finally {
      // Set using false after a short delay to prevent multiple clicks
      setTimeout(() => setUsing(false), 500);
    }
  };

  // Get background style with focal points and opacity
  const getBgStyle = () => {
    if (!backgroundImage) return {};
    
    return {
      backgroundImage: `url(${backgroundImage})`,
      backgroundSize: 'cover',
      backgroundPosition: `${focalPointX || 50}% ${focalPointY || 50}%`,
      opacity: backgroundOpacity / 100,
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
      {backgroundImage && (
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
              highlight_effect && "bg-yellow-300/30 px-2 py-1 rounded",
            )}
            style={{ color: title_color }}>
              {title}
            </h3>
            
            {description && (
              <p className={cn(
                "text-sm mt-1",
                highlight_effect && "bg-yellow-300/20 px-2 py-1 rounded",
              )}
              style={{ color: subtext_color }}>
                {description}
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
              style={{ backgroundColor: isDomReward ? "#ea384c" : (calendar_color || '#7E69AB') }}
            >
              {isDomReward ? (
                <Crown className="h-3 w-3 mr-1" />
              ) : (
                <Coins className="h-3 w-3 mr-1" />
              )}
              {cost} pts
            </div>
          </div>
        </div>
        
        <div className="mt-auto pt-4 flex justify-between items-center">
          <div className="flex items-center">
            <Badge className={`${supplyBadgeColor} text-white font-bold flex items-center gap-1`}>
              <Box className="h-3 w-3" />
              <span>{supply}</span>
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
      </div>
    </Card>
  );
};

export default RewardCard;
