import React from 'react';
import { Badge } from '../ui/badge';

interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high';
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  let badgeText = '';
  let badgeColor = 'secondary';

  switch (priority) {
    case 'low':
      badgeText = 'Low Priority';
      badgeColor = 'secondary';
      break;
    case 'medium':
      badgeText = 'Medium Priority';
      badgeColor = 'warning';
      break;
    case 'high':
      badgeText = 'High Priority';
      badgeColor = 'destructive';
      break;
    default:
      badgeText = 'Medium Priority';
      badgeColor = 'warning';
      break;
  }

  return (
    <Badge variant={badgeColor}>{badgeText}</Badge>
  );
};

export default PriorityBadge;