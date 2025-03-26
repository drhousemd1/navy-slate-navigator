
import React from 'react';
import { FormLabel } from "@/components/ui/form";
import IconSelector from '../../task-editor/IconSelector';
import PredefinedIconsGrid from '../../task-editor/PredefinedIconsGrid';
import TaskIcon from '@/components/task/TaskIcon';

interface PunishmentIconSectionProps {
  selectedIconName: string | null;
  iconPreview: string | null;
  iconColor: string;
  onSelectIcon: (iconName: string) => void;
  onUploadIcon: () => void;
  onRemoveIcon: () => void;
}

const PunishmentIconSection: React.FC<PunishmentIconSectionProps> = ({
  selectedIconName,
  iconPreview,
  iconColor,
  onSelectIcon,
  onUploadIcon,
  onRemoveIcon
}) => {
  return (
    <div className="space-y-4">
      <FormLabel className="text-white text-lg">Punishment Icon</FormLabel>
      <div className="grid grid-cols-2 gap-4">
        <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
          <IconSelector
            selectedIconName={selectedIconName}
            iconPreview={iconPreview}
            iconColor={iconColor}
            onSelectIcon={onSelectIcon}
            onUploadIcon={onUploadIcon}
            onRemoveIcon={onRemoveIcon}
            renderIcon={(iconName) => (
              <TaskIcon 
                icon_name={iconName} 
                icon_color={iconColor}
                className="h-6 w-6"
              />
            )}
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

export default PunishmentIconSection;
