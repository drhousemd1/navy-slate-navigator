
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';

interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high';
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const config = {
    low: {
      color: 'bg-blue-600',
      icon: <ArrowDown className="h-3 w-3 mr-1" />,
      label: 'Low Priority',
    },
    medium: {
      color: 'bg-amber-600',
      icon: <ArrowRight className="h-3 w-3 mr-1" />,
      label: 'Medium Priority',
    },
    high: {
      color: 'bg-red-600',
      icon: <ArrowUp className="h-3 w-3 mr-1" />,
      label: 'High Priority',
    },
  };

  const { color, icon, label } = config[priority];

  return (
    <Badge className={`${color} text-white flex items-center`}>
      {icon}
      {label}
    </Badge>
  );
};

export default PriorityBadge;
