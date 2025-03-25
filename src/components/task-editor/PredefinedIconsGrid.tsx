
import React, { useState } from 'react';
import { predefinedIcons } from './IconSelector';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import CustomIconsModal from './CustomIconsModal';

interface PredefinedIconsGridProps {
  selectedIconName: string | null;
  iconColor: string;
  onSelectIcon: (iconName: string) => void;
  onSelectCustomIcon?: (iconUrl: string) => void;
}

const PredefinedIconsGrid: React.FC<PredefinedIconsGridProps> = ({ 
  selectedIconName, 
  iconColor, 
  onSelectIcon,
  onSelectCustomIcon
}) => {
  const [isPresetsDialogOpen, setIsPresetsDialogOpen] = useState(false);
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);

  const handleIconSelect = (iconName: string) => {
    onSelectIcon(iconName);
    setIsPresetsDialogOpen(false);
  };

  const handleCustomIconSelect = (iconUrl: string) => {
    if (onSelectCustomIcon) {
      onSelectCustomIcon(iconUrl);
    }
  };

  return (
    <div className="border-2 border-light-navy rounded-lg p-4 flex flex-col h-full">
      <div className="space-y-3 mb-4">
        <Button 
          type="button"
          className="w-full bg-light-navy hover:bg-navy text-white"
          onClick={() => setIsPresetsDialogOpen(true)}
        >
          Browse Presets
        </Button>
        
        <Button 
          type="button"
          className="w-full bg-light-navy hover:bg-navy text-white"
          onClick={() => setIsCustomDialogOpen(true)}
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

      {/* Presets Dialog */}
      <Dialog open={isPresetsDialogOpen} onOpenChange={setIsPresetsDialogOpen}>
        <DialogContent className="bg-navy border-light-navy text-white max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Preset Icons
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh] pr-4">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 mt-4">
              {predefinedIcons.map((iconObj, index) => {
                const { name, icon: IconComponent } = iconObj;
                return (
                  <div 
                    key={index} 
                    className={`aspect-square rounded-md ${
                      selectedIconName === name ? 'bg-nav-active' : 'bg-light-navy'
                    } flex items-center justify-center cursor-pointer hover:bg-navy transition-colors p-2`}
                    onClick={() => handleIconSelect(name)}
                    aria-label={`Select ${name} icon`}
                    title={name}
                  >
                    <IconComponent 
                      className="h-6 w-6" 
                      style={{ color: iconColor }}
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Custom Icons Modal */}
      <CustomIconsModal 
        isOpen={isCustomDialogOpen}
        onClose={() => setIsCustomDialogOpen(false)}
        onSelectIcon={handleCustomIconSelect}
        iconColor={iconColor}
      />
    </div>
  );
};

export default PredefinedIconsGrid;
