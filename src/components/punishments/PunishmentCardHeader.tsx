
import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Minus, Crown, Coins, Package } from 'lucide-react'; // Added Package icon

interface PunishmentCardHeaderProps {
  points: number;
  dom_points: number; // Now required
  dom_supply: number; // Added dom_supply
  onPunish: () => void;
}

const PunishmentCardHeader: React.FC<PunishmentCardHeaderProps> = ({
  points,
  dom_points,
  dom_supply, // Added dom_supply
  onPunish
}) => {
  // dom_points is now required, so direct usage. Defaulting logic removed.
  const displayDomPoints = dom_points;

  return (
    <div className="flex justify-between items-center mb-3">
      {/* DOM Supply Badge - New element */}
      <Badge
        className="bg-gray-700 text-white font-semibold flex items-center gap-1 px-2 py-1 text-xs border border-gray-500"
        variant="default"
      >
        <Package className="h-3 w-3" />
        {dom_supply} Left
      </Badge>
      
      <div className="flex items-center gap-2">
        {/* Points badge for deduction */}
        <Badge 
          className="bg-black text-white font-bold flex items-center gap-1 px-2 border border-[#00f0ff]"
          variant="default"
        >
          <Coins className="h-3 w-3" />
          <span className="flex items-center">
            <Minus className="h-2 w-2 mr-0.5" />
            {Math.abs(points)}
          </span>
        </Badge>
        
        {/* Points badge for dom rewards */}
        <Badge
          className="bg-black text-white font-bold flex items-center gap-1 px-2 border border-red-500"
          variant="default"
        >
          <Crown className="h-3 w-3" />
          {displayDomPoints}
        </Badge>
        
        {/* Punish button */}
        <Button
          variant="destructive"
          size="sm"
          className="bg-red-500 text-white hover:bg-red-600/90 h-8 px-3 text-sm"
          onClick={onPunish}
          disabled={dom_supply <= 0} // Disable if no supply
        >
          Punish
        </Button>
      </div>
    </div>
  );
};

export default PunishmentCardHeader;
