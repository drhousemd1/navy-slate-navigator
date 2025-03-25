
import React from 'react';

interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high';
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const getPriorityColor = () => {
    switch (priority) {
      case 'high':
        return '#ff4466'; // Neon reddish-pink
      case 'medium':
        return '#ff9934'; // Neon orange
      case 'low':
        return '#4dff88'; // Neon green
      default:
        return '#ff9934'; // Default to medium color
    }
  };

  const color = getPriorityColor();

  return (
    <div className="font-bold capitalize px-3 py-1 text-sm">
      <span
        className="neon-text"
        style={{ 
          color: color,
          textShadow: `0 0 5px ${color}, 0 0 10px ${color}` 
        }}
      >
        {priority}
      </span>
    </div>
  );
};

export default PriorityBadge;
