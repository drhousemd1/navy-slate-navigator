
import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Minus, Crown, Coins } from 'lucide-react'; // Removed Package icon

interface PunishmentCardHeaderProps {
  points: number;
  dom_points: number;
  dom_supply: number;
  onPunish: () => void;
}

const PunishmentCardHeader: React.FC<PunishmentCardHeaderProps> = ({
  points,
  dom_points,
  dom_supply,
  onPunish
}) => {
  const displayDomPoints = dom_points;

  return (
    <div className="flex justify-between items-center mb-3">
      {/* DOM Supply Badge - Removed this new element */}
      {/* The empty div or a placeholder on the left side can be removed if not needed for layout */}
      <div></div> {/* Retaining a div for layout balance if the original design had something on the left, otherwise can be removed too if it was only for the new badge */}
      
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
        
        {/* Punish button - REMOVED disabled attribute */}
        <Button
          variant="destructive"
          size="sm"
          className="bg-red-500 text-white hover:bg-red-600/90 h-8 px-3 text-sm"
          onClick={onPunish}
          // disabled={dom_supply <= 0} // This line is removed
        >
          Punish
        </Button>
      </div>
    </div>
  );
};

export default PunishmentCardHeader;
