
import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Minus } from 'lucide-react';

interface PunishmentCardHeaderProps {
  points: number;
  onPunish: () => void;
}

const PunishmentCardHeader: React.FC<PunishmentCardHeaderProps> = ({
  points,
  onPunish
}) => {
  return (
    <div className="flex justify-between items-start mb-3">
      <div className="h-6"></div>
      
      <div className="flex items-center gap-2">
        <Badge 
          className="bg-red-500 text-white font-bold flex items-center gap-1"
          variant="default"
        >
          <Minus className="h-3 w-3" />
          {Math.abs(points)}
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
