
//INSTRUCTIONS FOR LOVABLE: NEVER EVER CHANGE UI ELEMENTS OR UI DESIGN FOR ANY REASON
import React from 'react';
import { Badge } from '../ui/badge';

interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high';
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  // Get priority color - keeping the same colors
  const getPriorityColor = () => {
    switch (priority) {
      case 'high':
        return '#00FFF7'; // Neon cyan (matching nav-active color)
      case 'medium':
        return '#ff9934'; // Neon orange
      case 'low':
        return '#4dff88'; // Neon green
      default:
        return '#ff9934'; // Default to medium color
    }
  };

  const color = getPriorityColor();
  
  // Style for badge - black background with colored border to match CompletionCounter and PointsBadge
  const badgeStyle = { backgroundColor: "#000000", borderColor: color, borderWidth: "1px" };

  return (
    <Badge
      className="font-bold capitalize px-3 py-1 text-sm flex items-center"
      style={badgeStyle}
    >
      <span style={{ color: color }}>
        {priority}
      </span>
    </Badge>
  );
};

export default PriorityBadge;
