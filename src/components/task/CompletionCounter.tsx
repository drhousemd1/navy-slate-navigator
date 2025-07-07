
import React from 'react';
import { Badge } from '../ui/badge';

interface CompletionCounterProps {
  currentCompletions: number;
  maxCompletions: number;
  isDomTask?: boolean;
}

const CompletionCounter: React.FC<CompletionCounterProps> = ({ 
  currentCompletions = 0,
  maxCompletions = 1,
  isDomTask = false
}) => {
  // Style for badge - black background with conditional border color
  const borderColor = isDomTask ? "#ff0000" : "#00f0ff";
  const badgeStyle = { backgroundColor: "#000000", borderColor, borderWidth: "1px" };

  return (
    <Badge 
      className="text-white font-medium flex items-center"
      style={badgeStyle}
    >
      <span>{currentCompletions}/{maxCompletions}</span>
    </Badge>
  );
};

export default CompletionCounter;
