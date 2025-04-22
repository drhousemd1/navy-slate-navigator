import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';
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
  currentCompletions,
  maxCompletions
}) => {
  const isFullyCompleted = currentCompletions >= maxCompletions;

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => onToggleCompletion(!completed)}
      className="h-8 w-8 rounded-full p-0"
      disabled={isFullyCompleted}
    >
      {completed ? <CheckCircle className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
    </Button>
  );
};

export default CompletionButton;