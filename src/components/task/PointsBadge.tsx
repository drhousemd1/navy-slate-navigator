
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
      className="text-white font-bold flex items-center gap-1"
      style={badgeStyle}
    >
      <Coins className="h-3 w-3 mr-1" />
      {points > 0 ? <Plus className="h-3 w-3 mr-0.5" /> : <Minus className="h-3 w-3 mr-0.5" />}
      {Math.abs(points)}
    </Badge>
  );
};

export default PointsBadge;
