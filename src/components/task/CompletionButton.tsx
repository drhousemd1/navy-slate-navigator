
import React from 'react';
import { Button } from '../ui/button';
import { Task } from '@/lib/taskUtils';

interface CompletionButtonProps {
  completed: boolean;
  onToggleCompletion: (completed: boolean) => void;
  currentCompletions: number;
  maxCompletions: number;
  taskFrequency?: Task['frequency']; // Add this optional prop
}

const CompletionButton: React.FC<CompletionButtonProps> = ({ 
  completed, 
  onToggleCompletion,
  currentCompletions = 0,
  maxCompletions = 1,
  taskFrequency
}) => {
  const hasReachedMax = currentCompletions >= maxCompletions;
  
  return (
    <Button
      variant="default"
      size="sm"
      className={`${hasReachedMax ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-500'} text-white px-3 py-0 h-7`}
      onClick={() => !hasReachedMax && onToggleCompletion(!completed)}
      disabled={hasReachedMax}
    >
      <span className="text-xs">
        {hasReachedMax ? 'Completed' : 'Complete'}
      </span>
    </Button>
  );
};

export default CompletionButton;
