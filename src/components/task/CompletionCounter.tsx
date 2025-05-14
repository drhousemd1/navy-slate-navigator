
import React from 'react';
import { Badge } from '../ui/badge';

interface CompletionCounterProps {
  currentCompletions: number;
  maxCompletions: number;
}

const CompletionCounter: React.FC<CompletionCounterProps> = ({ 
  currentCompletions = 0,
  maxCompletions = 1
}) => {
  console.log(`CompletionCounter: Rendering with ${currentCompletions}/${maxCompletions}`);
  
  // Style for badge - black background with cyan border to match other elements
  const badgeStyle = { 
    backgroundColor: "#000000", 
    borderColor: "#00f0ff", 
    borderWidth: "1px" 
  };

  // Ensure we always display as a fraction X/Y, never just a number
  return (
    <Badge 
      className="text-white font-medium flex items-center"
      style={badgeStyle}
      data-testid="completion-counter"
    >
      {currentCompletions}/{maxCompletions}
    </Badge>
  );
};

export default CompletionCounter;
