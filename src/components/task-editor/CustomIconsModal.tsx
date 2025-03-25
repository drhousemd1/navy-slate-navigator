
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CustomIconsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIcon: (iconUrl: string) => void;
  iconColor: string;
}

interface CustomIcon {
  id: string;
  url: string;
  created_at: string;
}

const CustomIconsModal: React.FC<CustomIconsModalProps> = ({
  isOpen,
  onClose,
  onSelectIcon,
  iconColor
}) => {
  const [customIcons, setCustomIcons] = useState<CustomIcon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchCustomIcons();
    }
  }, [isOpen]);

  const fetchCustomIcons = async () => {
    try {
      setIsLoading(true);
      // This is a placeholder - in a real implementation, we would fetch from Supabase storage
      // For now, we'll simulate with an empty array
      const icons: CustomIcon[] = [];
      
      setCustomIcons(icons);
    } catch (error) {
      console.error('Error fetching custom icons:', error);
      toast({
        title: 'Error',
        description: 'Failed to load custom icons',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectIcon = (iconUrl: string) => {
    onSelectIcon(iconUrl);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-navy border-light-navy text-white max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            Custom Icons
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p className="text-light-navy">Loading custom icons...</p>
            </div>
          ) : customIcons.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <p className="text-light-navy">No custom icons uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 mt-4">
              {customIcons.map((icon) => (
                <div
                  key={icon.id}
                  className="aspect-square rounded-md bg-light-navy flex items-center justify-center cursor-pointer hover:bg-navy transition-colors p-2"
                  onClick={() => handleSelectIcon(icon.url)}
                  title="Custom Icon"
                >
                  <img
                    src={icon.url}
                    alt="Custom icon"
                    className="h-6 w-6 object-contain"
                    style={{ filter: iconColor !== '#FFFFFF' ? `drop-shadow(0 0 1px ${iconColor})` : 'none' }}
                  />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CustomIconsModal;
