
import React from 'react';
import { Reward } from '@/lib/rewardUtils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRewards } from '@/contexts/RewardsContext';
import TaskIcon from '@/components/task/TaskIcon';

interface RewardCardProps extends Reward {
  onEdit?: () => void;
}

const RewardCard: React.FC<RewardCardProps> = ({ 
  id, title, description, cost, supply, icon_name, icon_color, is_dom_reward, 
  background_opacity = 0, title_color = '#FFFFFF', subtext_color = '#8E9196', 
  calendar_color = '#7E69AB', onEdit 
}) => {
  const { handleBuyReward, totalPoints, domPoints } = useRewards();
  
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
        background_image_url: null,
        focal_point_x: 50,
        focal_point_y: 50,
        highlight_effect: false
      };
      
      await handleBuyReward(rewardData);
    } catch (error) {
      console.error('Error buying reward:', error);
    }
  };
  
  return (
    <Card className="bg-gray-800 border-gray-700 p-4 hover:shadow-lg transition-shadow relative">
      <div className="flex items-center mb-2">
        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mr-3">
          {icon_name && (
            <TaskIcon icon_name={icon_name} icon_color={icon_color || '#FFFFFF'} className="w-5 h-5" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-medium text-white">{title}</h3>
        </div>
      </div>
      
      {description && (
        <p className="text-sm text-gray-400 mb-4">{description}</p>
      )}
      
      <div className="flex items-center justify-between mt-3">
        <Badge 
          variant="outline" 
          className="bg-black border-primary text-white px-2 py-1 flex items-center gap-1"
        >
          <Coins className="w-3 h-3" />
          <span>{cost}</span>
        </Badge>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-black text-gray-400 border-gray-600">
            {supply} left
          </Badge>
          
          <Button 
            size="sm" 
            onClick={handleBuy}
            disabled={!canBuy || supply <= 0}
            className={`${is_dom_reward ? 'bg-amber-600 hover:bg-amber-700' : 'bg-primary hover:bg-primary/90'} text-white`}
          >
            Buy
          </Button>
          
          {onEdit && (
            <Button size="sm" variant="outline" onClick={onEdit}>
              Edit
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default RewardCard;
