import React from 'react';
import { Control } from 'react-hook-form';
import { RewardFormValues } from '@/data/rewards/types';
import IconSelector from '@/components/task-editor/IconSelector';
import PredefinedIconsGrid from '@/components/task-editor/PredefinedIconsGrid';
import ColorPickerField from '@/components/task-editor/ColorPickerField';
import { FormLabel } from '@/components/ui/form';

interface RewardIconSectionProps {
  control: Control<RewardFormValues>;
  selectedIconName: string | null;
  iconPreview: string | null;
  iconColor: string;
  onSelectIcon: (iconName: string) => void;
  onUploadIcon: () => void;
  onRemoveIcon: () => void;
}

const RewardIconSection: React.FC<RewardIconSectionProps> = ({
  control,
  selectedIconName,
  iconPreview,
  iconColor,
  onSelectIcon,
  onUploadIcon,
  onRemoveIcon,
}) => {
  return (
    <div className="space-y-4">
      <FormLabel className="text-white text-lg">Reward Icon</FormLabel>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <div className="md:col-span-1 border-2 border-dashed border-light-navy rounded-lg p-4 text-center min-h-[150px] flex flex-col justify-center">
          <IconSelector
            selectedIconName={selectedIconName}
            iconPreview={iconPreview}
            iconColor={iconColor}
            onSelectIcon={onSelectIcon}
            onUploadIcon={onUploadIcon}
            onRemoveIcon={onRemoveIcon}
          />
        </div>
        <div className="md:col-span-2">
          <PredefinedIconsGrid
            selectedIconName={selectedIconName}
            iconColor={iconColor}
            onSelectIcon={onSelectIcon}
          />
        </div>
      </div>
      <ColorPickerField 
        control={control} 
        name="icon_color" 
        label="Icon Color" 
      />
    </div>
  );
};

export default RewardIconSection;
