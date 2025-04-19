
import React from 'react';

interface Props {
  icon_name: string;
  icon_color: string;
  className?: string;
}

const TaskIcon = ({ icon_name, icon_color, className = '' }: Props) => {
  return (
    <div className={`w-6 h-6 rounded-full ${icon_color} flex items-center justify-center ${className}`}>
      <span className="text-xs font-bold text-white">{icon_name}</span>
    </div>
  );
};

export default TaskIcon;
