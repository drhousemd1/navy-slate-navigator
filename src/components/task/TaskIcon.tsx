
import React from 'react';
import * as LucideIcons from 'lucide-react';

interface TaskIconProps {
  icon_url?: string;
  icon_name?: string;
  icon_color?: string;
}

const TaskIcon: React.FC<TaskIconProps> = ({ 
  icon_url, 
  icon_name, 
  icon_color = '#9b87f5' 
}) => {
  if (icon_url) {
    return <img src={icon_url} alt="Task icon" className="w-6 h-6" />;
  }
  
  if (icon_name && icon_name in LucideIcons) {
    const IconComponent = LucideIcons[icon_name];
    if (typeof IconComponent === 'function') {
      return <IconComponent className="w-6 h-6" style={{ color: icon_color }} />;
    }
  }
  
  // Default to Calendar if no icon is found or specified
  const Calendar = LucideIcons.Calendar;
  return <Calendar className="w-6 h-6" style={{ color: icon_color }} />;
};

export default TaskIcon;
