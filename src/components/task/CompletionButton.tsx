
import React from 'react';
import { Button } from '../ui/button';

interface CompletionButtonProps {
  completed: boolean;
  onToggleCompletion: (completed: boolean) => void;
  currentCompletions: number;
  maxCompletions: number;
}

const CompletionButton: React.FC<CompletionButtonProps> = ({ 
  completed, 
  onToggleCompletion,
  currentCompletions = 0,
  maxCompletions = 1
}) => {
  // Fix the completed status detection logic
  const hasReachedMax = currentCompletions >= maxCompletions;
  
  const handleClick = () => {
    // Only allow completion if task hasn't reached max completions yet
    if (!hasReachedMax) {
      onToggleCompletion(true); // Always set to true when clicking the button
    }
  };
  
  return (
    <Button
      variant="default"
      size="sm"
      className={`${hasReachedMax ? 'bg-green-600' : 'bg-blue-500 hover:bg-blue-600'} text-white px-3 py-0 h-7`}
      onClick={handleClick}
      disabled={hasReachedMax}
    >
      <span className="text-xs">
        {hasReachedMax ? 'Completed' : 'Complete'}
      </span>
    </Button>
  );
};

export default CompletionButton;
