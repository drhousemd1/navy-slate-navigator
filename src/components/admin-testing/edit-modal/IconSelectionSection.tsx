
import React from 'react';
import { FormLabel } from '@/components/ui/form';
import IconSelector from '@/components/task-editor/IconSelector';
import PredefinedIconsGrid from '@/components/task-editor/PredefinedIconsGrid';

interface IconSelectionSectionProps {
  selectedIconName: string | null;
  iconPreview: string | null;
  iconColor: string;
  onSelectIcon: (iconName: string) => void;
  onUploadIcon: () => void;
  onRemoveIcon: () => void;
}

const IconSelectionSection: React.FC<IconSelectionSectionProps> = ({
  selectedIconName,
  iconPreview,
  iconColor,
  onSelectIcon,
  onUploadIcon,
  onRemoveIcon
}) => {
  return (
    <div className="space-y-4">
      <FormLabel className="text-white text-lg">Card Icon</FormLabel>
      <div className="grid grid-cols-2 gap-4">
        <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
          <IconSelector
            selectedIconName={selectedIconName}
            iconPreview={iconPreview}
            iconColor={iconColor}
            onSelectIcon={onSelectIcon}
            onUploadIcon={onUploadIcon}
            onRemoveIcon={onRemoveIcon}
          />
        </div>
        
        <PredefinedIconsGrid
          selectedIconName={selectedIconName}
          iconColor={iconColor}
          onSelectIcon={onSelectIcon}
        />
      </div>
    </div>
  );
};

export default IconSelectionSection;
