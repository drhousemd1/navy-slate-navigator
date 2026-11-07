import React from 'react';
import { getWellbeingColor } from '@/lib/wellbeingUtils';

interface MoodHealthBarProps {
  score: number | null;
  unavailableLabel?: string;
  onClick?: () => void;
  className?: string;
}

const MoodHealthBar = React.forwardRef<HTMLButtonElement, MoodHealthBarProps>(({
  score,
  unavailableLabel,
  onClick,
  className = ""
}, ref) => {
  const color = score === null ? 'hsl(var(--nav-inactive))' : getWellbeingColor(score);
  const fillPercentage = score === null ? 0 : Math.max(0, Math.min(100, score));

  return (
    <button type="button"
      ref={ref}
      className={`w-2 h-7 bg-white rounded-full cursor-pointer transition-all duration-200 hover:opacity-90 overflow-hidden relative ${className}`}
      aria-label={unavailableLabel ?? (score === null ? 'No saved wellbeing check-in' : `Wellbeing: ${score}/100`)}
      title={unavailableLabel ?? (score === null ? 'No saved wellbeing check-in' : `Wellbeing: ${score}/100`)}
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
    </button>
  );
});

MoodHealthBar.displayName = 'MoodHealthBar';

export default MoodHealthBar;
