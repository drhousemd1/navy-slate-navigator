
import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Minus, Crown } from 'lucide-react';

interface PunishmentCardHeaderProps {
  points: number;
  onPunish: () => void;
}

const PunishmentCardHeader: React.FC<PunishmentCardHeaderProps> = ({
  points,
  onPunish
}) => {
  // Dom points will be half the points deducted from submissive (for now)
  const domPoints = Math.ceil(Math.abs(points) / 2);

  return (
    <div className="flex justify-between items-start mb-3">
      <div className="h-6"></div>
      
      <div className="flex flex-col items-end gap-2">
        <Badge 
          className="bg-red-500 text-white font-bold flex items-center gap-1"
          variant="default"
        >
          <Minus className="h-3 w-3" />
          {Math.abs(points)}
        </Badge>
        
        <Badge
          className="bg-red-500 text-white font-bold flex items-center gap-1"
          variant="default"
        >
          <Crown className="h-3 w-3" />
          {domPoints}
        </Badge>
        
        <Button
          variant="destructive"
          size="sm"
          className="bg-red-500 text-white hover:bg-red-600/90 h-7"
          onClick={onPunish}
        >
          Punish
        </Button>
      </div>
    </div>
  );
};

export default PunishmentCardHeader;
