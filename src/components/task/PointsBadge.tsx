
import React from 'react';
import { Badge } from '../ui/badge';
import { Plus, Minus, Coins, Crown } from 'lucide-react';

interface PointsBadgeProps {
  points: number;
  isDomTask?: boolean;
}

const PointsBadge: React.FC<PointsBadgeProps> = ({ points, isDomTask = false }) => {
  // Style for badge - different colors for Dom vs Sub tasks
  const badgeStyle = isDomTask 
    ? { backgroundColor: "#000000", borderColor: "#ea384c", borderWidth: "1px" }
    : { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };

  return (
    <Badge 
      className="text-white font-bold flex items-center gap-1 px-2"
      style={badgeStyle}
    >
      {isDomTask ? <Crown className="h-3 w-3" /> : <Coins className="h-3 w-3" />}
      <span className="flex items-center">
        {points >= 0 ? (
          <>
            <Plus className="h-2 w-2 mr-0.5" />
            {Math.abs(points)}
          </>
        ) : (
          <>
            <Minus className="h-2 w-2 mr-0.5" />
            {Math.abs(points)}
          </>
        )}
      </span>
    </Badge>
  );
};

export default PointsBadge;
