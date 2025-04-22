import React from 'react';

interface TaskIconProps {
  icon_url?: string;
  icon_name?: string;
  icon_color?: string;
}

const TaskIcon: React.FC<TaskIconProps> = ({
  icon_url,
  icon_name,
  icon_color = '#9b87f5',
}) => {
  return (
    <img
      src={icon_url || `/placeholder.svg`}
      alt={icon_name || 'Task Icon'}
      className="w-full h-full object-cover rounded-full"
      style={{ color: icon_color }}
    />
  );
};

export default TaskIcon;