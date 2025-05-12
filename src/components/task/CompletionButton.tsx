
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
  // Check if we've reached maximum completions
  const hasReachedMax = currentCompletions >= maxCompletions;
  
  const handleClick = () => {
    // Only allow marking as completed if we haven't reached max completions
    if (!hasReachedMax) {
      onToggleCompletion(true); // Mark as completed
    }
  };
  
  return (
    <Button
      variant="default"
      size="sm"
      className={`${hasReachedMax ? 'bg-green-600 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'} text-white px-3 py-0 h-7`}
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
