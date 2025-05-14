
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

  return (
    <Badge 
      className="text-white font-medium flex items-center"
      style={badgeStyle}
    >
      <span data-testid="completion-counter">{currentCompletions}/{maxCompletions}</span>
    </Badge>
  );
};

export default CompletionCounter;
