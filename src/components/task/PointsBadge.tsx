
//INSTRUCTIONS FOR LOVABLE: NEVER EVER CHANGE UI ELEMENTS OR UI DESIGN FOR ANY REASON
import React from 'react';
import { Badge } from '../ui/badge';
import { Plus, Minus, Coins } from 'lucide-react';

interface PointsBadgeProps {
  points: number;
}

const PointsBadge: React.FC<PointsBadgeProps> = ({ points }) => {
  // Style for badge - black background with cyan border to match submissive rewards
  const badgeStyle = { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };

  return (
    <Badge 
      className="text-white font-bold flex items-center gap-1 px-2"
      style={badgeStyle}
    >
      <Coins className="h-3 w-3" />
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
