
import React from 'react';
import { Badge } from '../ui/badge';
import { Box, Ticket, Coins, Crown, Minus } from 'lucide-react';
import { Button } from '../ui/button';

interface RewardHeaderProps {
  title: string;
  supply: number;
  cost: number;
  isDomReward?: boolean;
  onBuy: (cost: number) => void;
  onUse: () => void;
}

const RewardHeader: React.FC<RewardHeaderProps> = ({
  title,
  supply,
  cost,
  isDomReward = false,
  onBuy,
  onUse
}) => {
  // Colors based on reward type
  const buyButtonColor = isDomReward 
    ? "bg-red-600 hover:bg-red-700" 
    : "bg-nav-active hover:bg-nav-active/90";
  
  const costBadgeColor = isDomReward 
    ? "bg-red-600" 
    : "bg-nav-active";
  
  // Updated: Both DOM and non-DOM rewards now have black backgrounds with colored borders
  const supplyBadgeStyle = isDomReward 
    ? { backgroundColor: "#000000", borderColor: "#ea384c", borderWidth: "1px" } // Black with red border for dom rewards
    : { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" }; // Black with blue border for sub rewards
  
  // Use Crown icon for dom rewards, Coins for sub rewards
  const CostIcon = isDomReward ? Crown : Coins;
  
  console.log("RewardHeader rendered with isDomReward:", isDomReward);

  return (
    <div className="flex justify-between items-start mb-3">
      <div className="flex items-center gap-2">
        <Badge 
          className="text-white font-bold flex items-center gap-1" 
          style={supplyBadgeStyle} // Apply the style directly to the badge
        >
          <Box className="h-3 w-3" />
          <span>{supply}</span>
        </Badge>
        
        {supply > 0 && (
          <Button 
            variant="outline" 
            size="sm"
            className="p-1 h-7 text-blue-500 border-blue-500 hover:bg-blue-500/10 hover:text-blue-400 flex items-center gap-1"
            onClick={onUse}
          >
            <Ticket className="h-4 w-4" />
            <span>Use</span>
          </Button>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Badge 
          className={`${costBadgeColor} text-white font-bold flex items-center gap-1 px-2`}
          variant="default"
        >
          <CostIcon className="h-3 w-3" />
          <span className="flex items-center">
            <Minus className="h-2 w-2 mr-0.5" />
            {cost}
          </span>
        </Badge>
        <Button
          variant="default"
          size="sm"
          className={`${buyButtonColor} text-white h-7`}
          onClick={() => onBuy(cost)}
        >
          Buy
        </Button>
      </div>
    </div>
  );
};

export default RewardHeader;
