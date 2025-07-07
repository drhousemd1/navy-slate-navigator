import React from 'react';
import { getWellbeingColor, getWellbeingColorClass } from '@/lib/wellbeingUtils';

interface MoodHealthBarProps {
  score: number;
  onClick?: () => void;
  className?: string;
}

const MoodHealthBar = React.forwardRef<HTMLDivElement, MoodHealthBarProps>(({ 
  score, 
  onClick, 
  className = "" 
}, ref) => {
  const color = getWellbeingColor(score);
  const fillPercentage = Math.max(0, Math.min(100, score));

  return (
    <div 
      ref={ref}
      className={`w-2 h-7 bg-white rounded-full cursor-pointer transition-all duration-200 hover:opacity-90 overflow-hidden relative ${className}`}
      title={`Wellbeing: ${score}/100`}
      onClick={onClick}
    >
      {/* Fill level indicator */}
      <div 
        className="w-full rounded-full transition-all duration-300 ease-out absolute bottom-0"
        style={{ 
          backgroundColor: color,
          height: `${fillPercentage}%`
        }}
      />
    </div>
  );
});

MoodHealthBar.displayName = 'MoodHealthBar';

export default MoodHealthBar;