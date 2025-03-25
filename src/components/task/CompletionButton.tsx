
import React from 'react';
import { Button } from '../ui/button';
import { Check } from 'lucide-react';

interface CompletionButtonProps {
  completed: boolean;
  onToggleCompletion: (completed: boolean) => void;
}

const CompletionButton: React.FC<CompletionButtonProps> = ({ 
  completed, 
  onToggleCompletion 
}) => {
  return (
    <Button
      variant="default"
      size="sm"
      className={`${completed ? 'bg-green-600 text-white' : 'bg-green-500 text-white'} px-2 py-0 h-7`}
      onClick={() => onToggleCompletion(!completed)}
    >
      {completed ? (
        <span className="flex items-center gap-1">
          <Check className="h-3 w-3" />
          <span className="text-xs">Completed</span>
        </span>
      ) : (
        <span className="text-xs">Complete</span>
      )}
    </Button>
  );
};

export default CompletionButton;
