
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import CustomIconsModal from './CustomIconsModal';
import RecentIcons from './icons/RecentIcons';
import IconsDialog from './icons/IconsDialog';
import { updateRecentIcons } from './icons/recentIconsStorage';

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
  const [isPresetsDialogOpen, setIsPresetsDialogOpen] = useState(false);
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);

  const handleIconSelect = (iconName: string) => {
    onSelectIcon(iconName);
    
    // Update recently used icons
    updateRecentIcons({
      name: iconName,
      isCustom: false
    });
    
    setIsPresetsDialogOpen(false);
  };

  const handleCustomIconSelect = (iconUrl: string) => {
    // We pass the URL as the "iconName" to IconSelector, but TaskEditorForm will
    // handle this by setting icon_url and clearing icon_name
    onSelectIcon(`custom:${iconUrl}`);
    
    // Update recently used icons
    updateRecentIcons({
      name: 'custom',
      isCustom: true,
      url: iconUrl
    });
    
    setIsCustomDialogOpen(false);
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
      
      <RecentIcons onSelectIcon={onSelectIcon} />

      {/* Presets Dialog */}
      <IconsDialog 
        isOpen={isPresetsDialogOpen}
        onClose={() => setIsPresetsDialogOpen(false)}
        selectedIconName={selectedIconName}
        iconColor={iconColor}
        onSelectIcon={handleIconSelect}
      />

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
