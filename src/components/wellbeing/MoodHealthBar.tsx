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
  const fillPercentage = Math.max(0, Math.min(100, score));

  return (
    <div 
      className={`w-2 h-6 bg-light-navy rounded-full cursor-pointer transition-all duration-200 hover:w-3 hover:opacity-90 overflow-hidden ${className}`}
      onClick={onClick}
      title={`Wellbeing: ${score}/100`}
    >
      {/* Fill level indicator */}
      <div 
        className="w-full rounded-full transition-all duration-300 ease-out"
        style={{ 
          backgroundColor: color,
          height: `${fillPercentage}%`,
          transform: `translateY(${100 - fillPercentage}%)`
        }}
      />
    </div>
  );
};

export default MoodHealthBar;