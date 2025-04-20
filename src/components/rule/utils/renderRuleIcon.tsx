
import React from 'react';
import { Check } from 'lucide-react';

interface RenderRuleIconProps {
  iconUrl?: string | null;
  iconName?: string | null;
  iconColor?: string;
  fallbackIcon?: React.ReactNode;
}

export const renderRuleIcon = ({
  iconUrl,
  iconName,
  iconColor = '#FFFFFF',
  fallbackIcon
}: RenderRuleIconProps) => {
  // If there's a custom uploaded icon URL, use that
  if (iconUrl) {
    return (
      <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center overflow-hidden">
        <img 
          src={iconUrl} 
          alt="Rule Icon" 
          className="w-full h-full object-cover"
          onError={(e) => {
            // If image fails to load, replace with fallback
            e.currentTarget.style.display = 'none';
            // Try to insert a fallback icon in the parent div
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            }
          }}
        />
      </div>
    );
  }

  // If there's an icon name, use that
  if (iconName) {
    // This would be where you'd handle predefined icons
    // For simplicity, we're using Check as a fallback
    return (
      <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
        <Check className="w-6 h-6" style={{ color: iconColor }} />
      </div>
    );
  }

  // Use the fallback icon if provided
  if (fallbackIcon) {
    return (
      <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
        {fallbackIcon}
      </div>
    );
  }

  // Default icon
  return (
    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
      <Check className="w-6 h-6" style={{ color: iconColor }} />
    </div>
  );
};
