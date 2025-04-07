
import React from 'react';
import PriorityBadge from '@/components/task/PriorityBadge';
import PointsBadge from '@/components/task/PointsBadge';

interface CardHeaderProps {
  priority: 'low' | 'medium' | 'high';
  points: number;
}

const CardHeader: React.FC<CardHeaderProps> = ({ priority, points }) => {
  return (
    <div className="flex justify-between items-start mb-3">
      <PriorityBadge priority={priority} />
      
      <div className="flex items-center gap-2">
        <PointsBadge points={points} />
      </div>
    </div>
  );
};

export default CardHeader;
