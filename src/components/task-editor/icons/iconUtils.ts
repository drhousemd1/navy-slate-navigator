
//INSTRUCTIONS FOR LOVABLE: NEVER EVER CHANGE UI ELEMENTS OR UI DESIGN FOR ANY REASON
import React from 'react';
import { predefinedIcons } from './predefinedIcons';

export const findIconComponent = (iconName: string) => {
  return predefinedIcons.find(i => i.name === iconName)?.icon;
};

export const renderIconWithColor = (
  iconName: string,
  iconColor: string,
  className: string = "h-6 w-6"
) => {
  const IconComponent = findIconComponent(iconName);
  if (!IconComponent) return null;
  return React.createElement(IconComponent, { className, style: { color: iconColor } });
};
