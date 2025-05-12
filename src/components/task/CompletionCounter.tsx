
import React from 'react';

interface CompletionCounterProps {
  currentCompletions: number;
  maxCompletions: number;
}

const CompletionCounter: React.FC<CompletionCounterProps> = ({ 
  currentCompletions, 
  maxCompletions 
}) => {
  // Ensure we never display more completions than the maximum allowed
  const displayCompletions = Math.min(currentCompletions, maxCompletions);
  
  return (
    <div 
      className="flex items-center justify-center bg-gray-700/50 rounded-full px-2 py-0.5 text-xs text-gray-200"
      title={`${displayCompletions} of ${maxCompletions} completions for today`}
    >
      {displayCompletions}/{maxCompletions}
    </div>
  );
};

export default CompletionCounter;
