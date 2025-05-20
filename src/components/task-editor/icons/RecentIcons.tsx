
//INSTRUCTIONS FOR LOVABLE: NEVER EVER CHANGE UI ELEMENTS OR UI DESIGN FOR ANY REASON
import React from 'react';
import { predefinedIcons } from './predefinedIcons';
import { RecentIcon, getRecentIcons, updateRecentIcons } from './recentIconsStorage';

interface RecentIconsProps {
  onSelectIcon: (iconName: string) => void;
}

const RecentIcons: React.FC<RecentIconsProps> = ({ onSelectIcon }) => {
  const [recentIcons, setRecentIcons] = React.useState<RecentIcon[]>([]);
  
  // Fixed default color for the recently used icons section
  const RECENT_ICONS_DEFAULT_COLOR = '#ff6b6b';

  // Load recently used icons on component mount
  React.useEffect(() => {
    setRecentIcons(getRecentIcons());
  }, []);

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
      return IconComponent ? <IconComponent className="h-6 w-6" style={{ color: RECENT_ICONS_DEFAULT_COLOR }} /> : null;
    }
  };

  return (
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
  );
};

export default RecentIcons;
