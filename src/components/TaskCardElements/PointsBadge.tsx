import React from 'react';
import { Badge } from '../ui/badge';

interface PointsBadgeProps {
  points: number;
}

const PointsBadge: React.FC<PointsBadgeProps> = ({ points }) => {
  return (
    <Badge>{points} Points</Badge>
  );
};

export default PointsBadge;