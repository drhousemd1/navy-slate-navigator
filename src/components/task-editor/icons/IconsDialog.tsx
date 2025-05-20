
//INSTRUCTIONS FOR LOVABLE: NEVER EVER CHANGE UI ELEMENTS OR UI DESIGN FOR ANY REASON
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { predefinedIcons } from './predefinedIcons';

interface IconsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIconName: string | null;
  iconColor: string;
  onSelectIcon: (iconName: string) => void;
}

const IconsDialog: React.FC<IconsDialogProps> = ({
  isOpen,
  onClose,
  selectedIconName,
  iconColor,
  onSelectIcon
}) => {
  const handleIconSelect = (iconName: string) => {
    onSelectIcon(iconName);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
  );
};

export default IconsDialog;
