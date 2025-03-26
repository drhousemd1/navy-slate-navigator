
import React from 'react';
import { findIconComponent } from './icons/iconUtils';
import { IconDisplay } from './icons/IconDisplay';
import { EmptyIconPlaceholder } from './icons/EmptyIconPlaceholder';

interface IconSelectorProps {
  selectedIconName: string | null;
  iconPreview: string | null;
  iconColor: string;
  onSelectIcon: (iconName: string) => void;
  onUploadIcon: () => void;
  onRemoveIcon: () => void;
  renderIcon?: (iconName: string) => React.ReactNode;
}

const IconSelector: React.FC<IconSelectorProps> = ({ 
  selectedIconName, 
  iconPreview, 
  iconColor,
  onSelectIcon, 
  onUploadIcon, 
  onRemoveIcon,
  renderIcon
}) => {
  const renderDefaultIcon = (iconName: string) => {
    const IconComponent = findIconComponent(iconName);
    if (!IconComponent) return null;
    return <IconComponent className="h-6 w-6" style={{ color: iconColor }} />;
  };

  const iconRenderer = renderIcon || renderDefaultIcon;

  if (iconPreview) {
    return <IconDisplay iconPreview={iconPreview} onUploadIcon={onUploadIcon} onRemoveIcon={onRemoveIcon} />;
  } 
  
  if (selectedIconName) {
    return (
      <IconDisplay onUploadIcon={onUploadIcon} onRemoveIcon={onRemoveIcon}>
        {iconRenderer(selectedIconName)}
      </IconDisplay>
    );
  }

  return (
    <EmptyIconPlaceholder 
      onUploadIcon={onUploadIcon} 
      onRemoveIcon={onRemoveIcon} 
      onSelectIcon={onSelectIcon}
    />
  );
};

export default IconSelector;
