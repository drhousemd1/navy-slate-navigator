
import React from 'react';
import { predefinedIcons } from './IconSelector';
import { Button } from '@/components/ui/button';

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
    <div className="border-2 border-light-navy rounded-lg p-4 flex flex-col h-full">
      <div className="space-y-3 mb-4">
        <Button 
          type="button"
          className="w-full bg-light-navy hover:bg-navy text-white"
        >
          Browse Presets
        </Button>
        
        <Button 
          type="button"
          className="w-full bg-light-navy hover:bg-navy text-white"
        >
          Browse Custom
        </Button>
      </div>
      
      <div className="mt-2">
        <p className="text-white text-sm font-medium mb-2">Recently Used Icons</p>
        <div className="grid grid-cols-5 gap-2">
          {[...Array(5)].map((_, index) => (
            <div 
              key={index} 
              className="w-full aspect-square rounded-md bg-dark-navy flex items-center justify-center"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PredefinedIconsGrid;
