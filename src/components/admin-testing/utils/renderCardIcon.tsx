
import React from 'react';
import TaskIcon from '@/components/task/TaskIcon';

interface RenderCardIconProps {
  iconUrl?: string;
  iconName?: string;
  iconColor?: string;
  fallbackIcon?: React.ReactNode;
}

export const renderCardIcon = ({
  iconUrl,
  iconName,
  iconColor = '#FFFFFF',
  fallbackIcon
}: RenderCardIconProps): React.ReactNode => {
  if (iconUrl) {
    return (
      <img 
        src={iconUrl} 
        alt="Card icon" 
        className="w-6 h-6 object-contain"
        style={{ color: iconColor }}
      />
    );
  } 
  
  if (iconName) {
    return (
      <TaskIcon 
        icon_name={iconName} 
        icon_color={iconColor}
        className="w-6 h-6"
      />
    );
  } 
  
  return fallbackIcon;
};
