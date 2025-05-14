
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
  
  const handleClick = () => {
    // For daily/weekly tasks, we want to increment the counter, not just toggle completion
    if (taskFrequency === 'daily' || taskFrequency === 'weekly') {
      console.log('CompletionButton: Incrementing completion count', currentCompletions, maxCompletions);
      // Always pass true to increment the counter, the actual count will be handled in toggleTaskCompletion
      onToggleCompletion(true);
    } else {
      // For one-time tasks, just toggle the completed state
      console.log('CompletionButton: Toggling completion to', !completed);
      onToggleCompletion(!completed);
    }
  };
  
  return (
    <Button
      variant="default"
      size="sm"
      className={`${hasReachedMax ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-500'} text-white px-3 py-0 h-7`}
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
