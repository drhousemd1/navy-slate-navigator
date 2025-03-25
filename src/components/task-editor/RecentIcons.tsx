
import React from 'react';
import { Separator } from "@/components/ui/separator";

interface RecentIconsProps {
  recentIcons: string[];
  iconColor: string;
  onSelectIcon: (iconName: string) => void;
  icons: { name: string; icon: React.FC<any> }[];
}

const RecentIcons: React.FC<RecentIconsProps> = ({
  recentIcons,
  iconColor,
  onSelectIcon,
  icons
}) => {
  if (recentIcons.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <Separator className="bg-light-navy/30 my-3" />
      <p className="text-white text-sm font-medium mb-2">Recent</p>
      <div className="grid grid-cols-4 gap-2">
        {recentIcons.map((iconName, index) => {
          const iconObj = icons.find(i => i.name === iconName);
          if (!iconObj) return null;
          
          const { icon: IconComponent } = iconObj;
          return (
            <button
              key={index}
              className="w-10 h-10 rounded-md bg-light-navy flex items-center justify-center cursor-pointer hover:bg-navy transition-colors"
              onClick={() => onSelectIcon(iconName)}
              aria-label={`Select ${iconName} icon`}
            >
              <IconComponent
                className="h-6 w-6 text-white"
                style={{ color: iconColor }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RecentIcons;
