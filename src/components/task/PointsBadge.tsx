
import React from 'react';
import { Badge } from '../ui/badge';
import { Plus, Minus } from 'lucide-react';

interface PointsBadgeProps {
  points: number;
}

const PointsBadge: React.FC<PointsBadgeProps> = ({ points }) => {
  return (
    <Badge 
      className="bg-nav-active text-white font-bold flex items-center gap-1"
      variant="default"
    >
      {points > 0 ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
      {Math.abs(points)}
    </Badge>
  );
};

export default PointsBadge;
