import React from 'react';

interface TaskCardFooterProps {
  frequency?: 'daily' | 'weekly';
  frequency_count?: number;
  calendar_color?: string;
  usage_data?: number[];
  onEdit: () => void;
  children: React.ReactNode;
}

const TaskCardFooter: React.FC<TaskCardFooterProps> = ({
  frequency,
  frequency_count,
  calendar_color,
  usage_data,
  onEdit, 
  children
}) => {
  return (
    <div className="flex items-center justify-between mt-4">
      {children}
    </div>
  );
};

export default TaskCardFooter;