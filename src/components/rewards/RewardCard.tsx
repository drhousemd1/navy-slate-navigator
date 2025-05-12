
import React from 'react';
import { Reward } from '@/lib/rewardUtils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRewards } from '@/contexts/RewardsContext';
import TaskIcon from '@/components/task/TaskIcon';

interface RewardCardProps extends Reward {
  onEdit?: () => void;
}

const RewardCard: React.FC<RewardCardProps> = ({ 
  id, title, description, cost, supply, icon_name, icon_color, is_dom_reward, 
  background_image_url, background_opacity = 0, focal_point_x = 50, focal_point_y = 50,
  title_color = '#FFFFFF', subtext_color = '#8E9196', 
  calendar_color = '#7E69AB', highlight_effect = false, onEdit 
}) => {
  const { handleBuyReward, handleUseReward, totalPoints, domPoints } = useRewards();
  
  // Check if user has enough points to buy this reward
  const canBuy = is_dom_reward 
    ? (domPoints !== undefined && domPoints >= cost) 
    : (totalPoints !== undefined && totalPoints >= cost);
    
  const handleBuy = async () => {
    if (!id) return;
    
    try {
      // Create a complete Reward object with default values for missing properties
      const rewardData: Reward = {
        id, title, description, cost, supply, icon_name, icon_color, is_dom_reward,
        background_opacity: background_opacity || 0,
        title_color: title_color || '#FFFFFF',
        subtext_color: subtext_color || '#8E9196',
        calendar_color: calendar_color || '#7E69AB',
        background_image_url,
        focal_point_x,
        focal_point_y,
        highlight_effect
      };
      
      await handleBuyReward(rewardData);
    } catch (error) {
      console.error('Error buying reward:', error);
    }
  };
  
  const handleUse = async () => {
    if (!id || supply <= 0) return;
    
    try {
      await handleUseReward(id);
    } catch (error) {
      console.error('Error using reward:', error);
    }
  };
  
  // Define border color based on if it's a dom reward and if there's supply
  const cardBorderColor = is_dom_reward 
    ? "#ea384c" // Red for dom rewards
    : (supply > 0 ? "#FEF7CD" : "#00f0ff"); // Yellow for sub rewards with supply, blue otherwise
  
  const cardBorderStyle = {
    borderColor: cardBorderColor,
    boxShadow: supply > 0 ? `0 0 8px 2px rgba(${is_dom_reward ? '234, 56, 76, 0.6' : '254, 247, 205, 0.6'})` : undefined,
    backgroundColor: '#000000' // Adding black background
  };

  return (
    <Card 
      className="relative overflow-hidden border-2 bg-navy z-0"
      style={cardBorderStyle}
    >
      {background_image_url && (
        <div 
          className="absolute inset-0 z-0" 
          style={{
            backgroundImage: `url(${background_image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: `${focal_point_x}% ${focal_point_y}%`,
            opacity: background_opacity / 100,
          }}
        />
      )}
      <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <Badge 
              className="text-white font-bold flex items-center gap-1" 
              style={{
                backgroundColor: "#000000",
                borderColor: is_dom_reward ? "#ea384c" : "#00f0ff",
                borderWidth: "1px"
              }}
            >
              <span>{supply}</span>
            </Badge>
            
            {supply > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                className="p-1 h-7 text-blue-500 border-blue-500 hover:bg-blue-500/10 hover:text-blue-400"
                onClick={handleUse}
              >
                Use
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              className="text-white font-bold flex items-center gap-1" 
              style={{
                backgroundColor: "#000000",
                borderColor: is_dom_reward ? "#ea384c" : "#00f0ff",
                borderWidth: "1px"
              }}
            >
              {is_dom_reward ? <Crown className="h-3 w-3 mr-1" /> : <Coins className="h-3 w-3 mr-1" />}
              <span>{cost}</span>
            </Badge>
            
            <Button
              variant="default"
              size="sm"
              className={`${is_dom_reward ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-500 hover:bg-blue-600'} text-white h-7`}
              onClick={handleBuy}
              disabled={!canBuy}
            >
              Buy
            </Button>
          </div>
        </div>
        
        <div className="mb-3 flex items-start gap-3">
          <div className="w-10 h-10 flex-shrink-0 bg-gray-800 rounded-full flex items-center justify-center">
            {icon_name && (
              <TaskIcon 
                icon_name={icon_name} 
                icon_color={icon_color || '#FFFFFF'} 
                className="w-5 h-5" 
              />
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-medium" style={{ color: title_color }}>
              {title}
            </h3>
            {description && (
              <p className="text-sm" style={{ color: subtext_color }}>
                {description}
              </p>
            )}
          </div>
        </div>
        
        {onEdit && (
          <div className="mt-auto pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onEdit}
              className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Edit
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default RewardCard;
