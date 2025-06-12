
import React from 'react';
import { Button } from '../ui/button';
import { Task } from '@/data/tasks/types';

interface CompletionButtonProps {
  task: Task;
  onToggleComplete: (taskId: string) => void;
  disabled?: boolean;
}

const CompletionButton: React.FC<CompletionButtonProps> = ({ 
  task, 
  onToggleComplete,
  disabled = false
}) => {
  return (
    <Button
      variant="default"
      size="sm"
      className={`${task.completed ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-500'} text-white px-3 py-0 h-7`}
      onClick={() => !disabled && onToggleComplete(task.id)}
      disabled={disabled || task.completed}
    >
      <span className="text-xs">
        {task.completed ? 'Completed' : 'Complete'}
      </span>
    </Button>
  );
};

export default CompletionButton;
