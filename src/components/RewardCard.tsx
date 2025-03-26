
import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Edit, Calendar, Box, Ticket } from 'lucide-react';
import TaskIcon from './task/TaskIcon';
import PointsBadge from './task/PointsBadge';
import { Badge } from './ui/badge';
import { Reward, buyReward } from '@/lib/rewardsUtils';
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from '@tanstack/react-query';

interface RewardCardProps {
  reward: Reward;
  userSupply: number;
  userPoints: number;
  onRewardUpdated?: () => void;
}

const RewardCard: React.FC<RewardCardProps> = ({
  reward,
  userSupply = 0,
  userPoints = 0,
  onRewardUpdated
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleBuy = async () => {
    if (isLoading) return;
    
    if (userPoints < reward.cost) {
      toast({
        title: "Not enough points",
        description: `You need ${reward.cost} points to buy this reward`,
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const success = await buyReward(reward);
      
      if (success) {
        // Invalidate queries to refresh the data
        queryClient.invalidateQueries({queryKey: ['userProfile']});
        queryClient.invalidateQueries({queryKey: ['userRewards']});
        
        if (onRewardUpdated) {
          onRewardUpdated();
        }
      }
    } catch (error) {
      console.error("Error buying reward:", error);
      toast({
        title: "Error",
        description: "Failed to purchase reward",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="relative overflow-hidden border-2 border-[#00f0ff] bg-navy">
      <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
        <div className="flex justify-between items-start mb-3">
          {/* Supply indicator */}
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500 text-white font-bold flex items-center gap-1">
              <Box className="h-3 w-3" />
              <span>{userSupply}</span>
            </Badge>
            
            {userSupply > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                className="p-1 h-7 text-blue-500 border-blue-500 hover:bg-blue-500/10 hover:text-blue-400 flex items-center gap-1"
              >
                <Ticket className="h-4 w-4" />
                <span>Use</span>
              </Button>
            )}
          </div>
          
          {/* Cost indicator */}
          <div className="flex items-center gap-2">
            <PointsBadge points={-reward.cost} />
            <Button
              variant="default"
              size="sm"
              className="bg-nav-active text-white hover:bg-nav-active/90 h-7"
              onClick={handleBuy}
              disabled={isLoading || userPoints < reward.cost}
            >
              {isLoading ? "Processing..." : "Buy"}
            </Button>
          </div>
        </div>
        
        <div className="flex items-start mb-auto">
          <div className="mr-4 flex-shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#00f0ff' }}>
              <TaskIcon 
                icon_name={reward.icon_name || 'Gift'} 
                icon_color={reward.icon_color || '#9b87f5'} 
              />
            </div>
          </div>
          
          <div className="flex-1 flex flex-col">
            <h3 className="text-xl font-semibold text-white">
              {reward.title}
            </h3>
            
            <div className="text-sm mt-1 text-[#8E9196]">
              {reward.description}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4">
          {/* Calendar tracker placeholder */}
          <div className="flex space-x-1 items-center">
            <Calendar className="h-4 w-4 mr-1 text-[#7E69AB]" />
            <div className="flex space-x-1">
              {[...Array(4)].map((_, i) => (
                <div 
                  key={i}
                  className="w-4 h-4 rounded-full border border-[#7E69AB] bg-transparent"
                />
              ))}
            </div>
          </div>
          
          <div className="flex space-x-2 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="bg-gray-700 text-white hover:bg-gray-600 hover:text-white rounded-full p-2 h-8 w-8 flex items-center justify-center"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RewardCard;
