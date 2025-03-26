
import React from 'react';
import { Badge } from '../ui/badge';
import { Box, Ticket } from 'lucide-react';
import { Button } from '../ui/button';
import PointsBadge from '../task/PointsBadge';
import { useToast } from '../../hooks/use-toast';

interface RewardHeaderProps {
  title: string;
  supply: number;
  cost: number;
  onBuy: () => void;
  onUse: () => void;
}

const RewardHeader: React.FC<RewardHeaderProps> = ({
  title,
  supply,
  cost,
  onBuy,
  onUse
}) => {
  const { toast } = useToast();
  
  const handleBuyClick = () => {
    onBuy();
    toast({
      title: "Reward Purchased",
      description: `You purchased ${title}`,
    });
  };

  const handleUseClick = () => {
    onUse();
    toast({
      title: "Reward Used",
      description: `You used ${title}`,
    });
  };

  return (
    <div className="flex justify-between items-start mb-3">
      <div className="flex items-center gap-2">
        <Badge className="bg-blue-500 text-white font-bold flex items-center gap-1">
          <Box className="h-3 w-3" />
          <span>{supply}</span>
        </Badge>
        
        {supply > 0 && (
          <Button 
            variant="outline" 
            size="sm"
            className="p-1 h-7 text-blue-500 border-blue-500 hover:bg-blue-500/10 hover:text-blue-400 flex items-center gap-1"
            onClick={handleUseClick}
          >
            <Ticket className="h-4 w-4" />
            <span>Use</span>
          </Button>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <PointsBadge points={-cost} />
        <Button
          variant="default"
          size="sm"
          className="bg-nav-active text-white hover:bg-nav-active/90 h-7"
          onClick={handleBuyClick}
        >
          Buy
        </Button>
      </div>
    </div>
  );
};

export default RewardHeader;
