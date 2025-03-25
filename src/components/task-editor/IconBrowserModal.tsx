
import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';
import { predefinedIcons } from './IconSelector';

interface IconBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIcon: (iconName: string) => void;
  iconColor: string;
}

const IconBrowserModal: React.FC<IconBrowserModalProps> = ({
  isOpen,
  onClose,
  onSelectIcon,
  iconColor
}) => {
  const handleSelectIcon = (iconName: string) => {
    onSelectIcon(iconName);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-navy border-light-navy text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            Browse Icons
          </DialogTitle>
          <DialogDescription className="text-light-navy">
            Select an icon for your task
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] mt-4" orientation="vertical">
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 p-1">
            {predefinedIcons.map((iconObj, index) => {
              const { name, icon: IconComponent } = iconObj;
              return (
                <button
                  key={index}
                  className="w-12 h-12 bg-dark-navy rounded-md flex items-center justify-center cursor-pointer hover:bg-light-navy transition-colors"
                  onClick={() => handleSelectIcon(name)}
                  aria-label={`Select ${name} icon`}
                >
                  <IconComponent
                    className="h-6 w-6 text-white"
                    style={{ color: iconColor }}
                  />
                </button>
              );
            })}
          </div>
        </ScrollArea>
        
        <div className="flex justify-end mt-4">
          <DialogClose asChild>
            <Button 
              type="button" 
              variant="secondary" 
              className="bg-dark-navy text-white hover:bg-light-navy"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IconBrowserModal;
