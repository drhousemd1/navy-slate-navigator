
import React from 'react';
import { Badge } from '../ui/badge';

interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high';
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const getPriorityColor = () => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'low':
        return 'bg-green-500';
      case 'medium':
      default:
        return 'bg-yellow-500';
    }
  };

  return (
    <Badge 
      className={`${getPriorityColor()} text-white font-bold capitalize px-3 py-1`}
      variant="default"
    >
      {priority}
    </Badge>
  );
};

export default PriorityBadge;
