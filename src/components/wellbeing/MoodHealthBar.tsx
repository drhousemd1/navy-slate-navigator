import React from 'react';
import { getWellbeingColor, getWellbeingColorClass } from '@/lib/wellbeingUtils';

interface MoodHealthBarProps {
  score: number;
  onClick?: () => void;
  className?: string;
}

const MoodHealthBar: React.FC<MoodHealthBarProps> = ({ 
  score, 
  onClick, 
  className = "" 
}) => {
  const color = getWellbeingColor(score);

  return (
    <div 
      className={`w-2 h-6 rounded-full cursor-pointer transition-all duration-200 hover:w-3 hover:opacity-90 ${className}`}
      style={{ backgroundColor: color }}
      onClick={onClick}
      title={`Wellbeing: ${score}/100`}
    >
      {/* Inner bar for visual depth */}
      <div 
        className="w-full h-full rounded-full" 
        style={{ backgroundColor: color, opacity: 0.8 }}
      />
    </div>
  );
};

export default MoodHealthBar;