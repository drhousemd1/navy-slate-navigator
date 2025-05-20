
import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Minus, Crown, Coins } from 'lucide-react';

interface PunishmentCardHeaderProps {
  points: number;
  dom_points?: number;
  onPunish: () => void;
}

const PunishmentCardHeader: React.FC<PunishmentCardHeaderProps> = ({
  points,
  dom_points,
  onPunish
}) => {
  // If dom_points is not provided, use half the points as default
  const displayDomPoints = dom_points !== undefined ? dom_points : Math.ceil(Math.abs(points) / 2);

  return (
    <div className="flex justify-between items-center mb-3">
      <div className="h-6"></div>
      
      <div className="flex items-center gap-2">
        {/* Points badge for deduction - updated with Coins icon and matching header style */}
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
        
        {/* Points badge for dom rewards - updated to match header style */}
        <Badge
          className="bg-black text-white font-bold flex items-center gap-1 px-2 border border-red-500"
          variant="default"
        >
          <Crown className="h-3 w-3" />
          {displayDomPoints}
        </Badge>
        
        {/* Punish button - updated size to match reward "Buy" buttons */}
        <Button
          variant="destructive"
          size="sm"
          className="bg-red-500 text-white hover:bg-red-600/90 h-8 px-3 text-sm"
          onClick={onPunish}
        >
          Punish
        </Button>
      </div>
    </div>
  );
};

export default PunishmentCardHeader;
