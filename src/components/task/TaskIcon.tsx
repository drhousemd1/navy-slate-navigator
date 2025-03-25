
import React from 'react';
import * as LucideIcons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

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
  
  if (icon_name) {
    // Use dynamic icon lookup
    const IconComponent = LucideIcons[icon_name as keyof typeof LucideIcons] as LucideIcon;
    
    if (IconComponent) {
      return <IconComponent className="w-6 h-6" style={{ color: icon_color }} />;
    }
  }
  
  // Default to Calendar icon
  return <LucideIcons.Calendar className="w-6 h-6" style={{ color: icon_color }} />;
};

export default TaskIcon;
