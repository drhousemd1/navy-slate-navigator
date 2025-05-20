
//INSTRUCTIONS FOR LOVABLE: NEVER EVER CHANGE UI ELEMENTS OR UI DESIGN FOR ANY REASON
import React from 'react';
import { Badge } from './badge';
import { Box, Crown } from 'lucide-react';

interface DOMBadgeProps {
  icon?: 'box' | 'crown';
  value: number | string;
  className?: string;
}

/**
 * A specialized badge component for DOM-related items with consistent styling.
 * Always renders with black background and red border.
 */
const DOMBadge: React.FC<DOMBadgeProps> = ({ 
  icon = 'box', 
  value,
  className = ''
}) => {
  // Determine which icon to show
  const IconComponent = icon === 'crown' ? Crown : Box;
  
  return (
    <Badge 
      variant="outline" 
      className={`dom-badge ${className}`}
    >
      <IconComponent className="w-3 h-3" />
      <span>{value}</span>
    </Badge>
  );
};

export { DOMBadge };
