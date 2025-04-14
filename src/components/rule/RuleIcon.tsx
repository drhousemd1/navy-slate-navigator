
import React from 'react';
import { findIconComponent } from '../task-editor/icons/iconUtils';

interface RuleIconProps {
  icon_url?: string | null;
  icon_name?: string | null;
  icon_color?: string;
  className?: string;
}

const RuleIcon: React.FC<RuleIconProps> = ({ 
  icon_url,
  icon_name,
  icon_color = '#FFFFFF', 
  className = 'h-5 w-5'
}) => {
  if (icon_url) {
    return (
      <img 
        src={icon_url} 
        alt="Rule icon" 
        className={className} 
        style={{ color: icon_color }}
      />
    );
  }

  if (icon_name) {
    const IconComponent = findIconComponent(icon_name);
    if (IconComponent) {
      return <IconComponent className={className} style={{ color: icon_color }} />;
    }
  }

  // Fallback icon if none provided
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
      style={{ color: icon_color }}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
};

export default RuleIcon;
