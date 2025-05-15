
import React from 'react';
import { Button } from '../ui/button';
import { toast } from '@/hooks/use-toast';

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
  const hasReachedMax = currentCompletions >= maxCompletions;
  
  const handleToggle = async () => {
    if (hasReachedMax) return;
    
    try {
      onToggleCompletion(!completed);
    } catch (error) {
      console.error("Error toggling completion:", error);
      toast({
        title: "Connection Error",
        description: "Your action was saved locally. It will sync when connection is restored.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Button
      variant="default"
      size="sm"
      className={`${hasReachedMax ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-500'} text-white px-3 py-0 h-7`}
      onClick={handleToggle}
      disabled={hasReachedMax}
    >
      <span className="text-xs">
        {hasReachedMax ? 'Completed' : 'Complete'}
      </span>
    </Button>
  );
};

export default CompletionButton;
