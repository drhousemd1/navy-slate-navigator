import React from 'react';

interface TaskCardHeaderProps {
  priority?: 'low' | 'medium' | 'high';
  points: number;
  completed?: boolean;
  onToggleCompletion?: (completed: boolean) => void;
  currentCompletions: number;
  maxCompletions: number;
  children: React.ReactNode;
}

const TaskCardHeader: React.FC<TaskCardHeaderProps> = ({
  priority = 'medium',
  points,
  completed = false,
  onToggleCompletion,
  currentCompletions,
  maxCompletions, 
  children
}) => {
  return (
    <div className="flex justify-between items-start mb-3">
      {children}
    </div>
  );
};

export default TaskCardHeader;