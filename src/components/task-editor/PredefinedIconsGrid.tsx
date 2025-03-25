
import React from 'react';
import { predefinedIcons } from './IconSelector';

interface PredefinedIconsGridProps {
  selectedIconName: string | null;
  iconColor: string;
  onSelectIcon: (iconName: string) => void;
}

const PredefinedIconsGrid: React.FC<PredefinedIconsGridProps> = ({ 
  selectedIconName, 
  iconColor, 
  onSelectIcon 
}) => {
  return (
    <div className="border-2 border-light-navy rounded-lg p-4">
      <p className="text-white mb-2">Predefined Icons</p>
      <div className="grid grid-cols-4 gap-2">
        {predefinedIcons.map((iconObj, index) => {
          const { name, icon: IconComponent } = iconObj;
          return (
            <div 
              key={index} 
              className={`w-10 h-10 rounded-md ${selectedIconName === name ? 'bg-nav-active' : 'bg-light-navy'} flex items-center justify-center cursor-pointer hover:bg-navy transition-colors`}
              onClick={() => onSelectIcon(name)}
            >
              <IconComponent 
                className="h-6 w-6 text-white" 
                style={{ color: iconColor }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PredefinedIconsGrid;
