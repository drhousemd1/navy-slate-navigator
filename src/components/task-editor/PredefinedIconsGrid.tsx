import React, { useState, useEffect } from 'react';
import { predefinedIcons } from './IconSelector';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import CustomIconsModal from './CustomIconsModal';

interface PredefinedIconsGridProps {
  selectedIconName: string | null;
  iconColor: string;
  onSelectIcon: (iconName: string) => void;
}

// Type for storing recently used icons
interface RecentIcon {
  name: string;
  isCustom: boolean;
  url?: string;
}

// Helper function to manage recently used icons
const updateRecentIcons = (iconToAdd: RecentIcon): RecentIcon[] => {
  // Get current recent icons from localStorage
  const recentIconsString = localStorage.getItem('recentIcons');
  let recentIcons: RecentIcon[] = recentIconsString ? JSON.parse(recentIconsString) : [];
  
  // Check if icon already exists in the list
  const existingIndex = recentIcons.findIndex(icon => 
    (icon.isCustom && iconToAdd.isCustom && icon.url === iconToAdd.url) || 
    (!icon.isCustom && !iconToAdd.isCustom && icon.name === iconToAdd.name)
  );
  
  // If icon exists, remove it (to move it to the front)
  if (existingIndex > -1) {
    recentIcons.splice(existingIndex, 1);
  }
  
  // Add icon to the front of the list
  recentIcons.unshift(iconToAdd);
  
  // Limit to 5 recent icons
  recentIcons = recentIcons.slice(0, 5);
  
  // Save to localStorage
  localStorage.setItem('recentIcons', JSON.stringify(recentIcons));
  
  return recentIcons;
};

const PredefinedIconsGrid: React.FC<PredefinedIconsGridProps> = ({ 
  selectedIconName, 
  iconColor, 
  onSelectIcon
}) => {
  const [isPresetsDialogOpen, setIsPresetsDialogOpen] = useState(false);
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  const [recentIcons, setRecentIcons] = useState<RecentIcon[]>([]);

  // Fixed default color for the recently used icons section
  const RECENT_ICONS_DEFAULT_COLOR = '#ff6b6b'; // Consistent color for recently used icons

  // Load recently used icons on component mount
  useEffect(() => {
    const recentIconsString = localStorage.getItem('recentIcons');
    if (recentIconsString) {
      setRecentIcons(JSON.parse(recentIconsString));
    }
  }, []);

  const handleIconSelect = (iconName: string) => {
    onSelectIcon(iconName);
    
    // Update recently used icons
    const updatedRecentIcons = updateRecentIcons({
      name: iconName,
      isCustom: false
    });
    setRecentIcons(updatedRecentIcons);
    
    setIsPresetsDialogOpen(false);
  };

  const handleCustomIconSelect = (iconUrl: string) => {
    // We pass the URL as the "iconName" to IconSelector, but TaskEditorForm will
    // handle this by setting icon_url and clearing icon_name
    onSelectIcon(`custom:${iconUrl}`);
    
    // Update recently used icons
    const updatedRecentIcons = updateRecentIcons({
      name: 'custom',
      isCustom: true,
      url: iconUrl
    });
    setRecentIcons(updatedRecentIcons);
    
    setIsCustomDialogOpen(false);
  };

  const handleRecentIconSelect = (recentIcon: RecentIcon) => {
    if (recentIcon.isCustom && recentIcon.url) {
      onSelectIcon(`custom:${recentIcon.url}`);
    } else {
      onSelectIcon(recentIcon.name);
    }
    
    // Move this icon to the front of recent icons without changing other properties
    const updatedRecentIcons = updateRecentIcons(recentIcon);
    setRecentIcons(updatedRecentIcons);
  };

  // Helper function to render an icon based on its type
  const renderIconComponent = (iconData: RecentIcon) => {
    if (iconData.isCustom && iconData.url) {
      return (
        <img 
          src={iconData.url} 
          alt="Custom Icon" 
          className="h-6 w-6 object-contain"
        />
      );
    } else {
      const IconComponent = predefinedIcons.find(i => i.name === iconData.name)?.icon;
      // Use the fixed color for recently used icons instead of the task's icon color
      return IconComponent ? <IconComponent className="h-6 w-6" style={{ color: RECENT_ICONS_DEFAULT_COLOR }} /> : null;
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
          {recentIcons.length > 0 ? (
            recentIcons.map((iconData, index) => (
              <div 
                key={index} 
                className="w-full aspect-square rounded-md bg-dark-navy flex items-center justify-center cursor-pointer hover:bg-navy transition-colors"
                onClick={() => handleRecentIconSelect(iconData)}
                title={iconData.isCustom ? "Custom icon" : iconData.name}
              >
                {renderIconComponent(iconData)}
              </div>
            ))
          ) : (
            // Empty placeholders when no recent icons
            [...Array(5)].map((_, index) => (
              <div 
                key={index} 
                className="w-full aspect-square rounded-md bg-dark-navy flex items-center justify-center"
              />
            ))
          )}
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
