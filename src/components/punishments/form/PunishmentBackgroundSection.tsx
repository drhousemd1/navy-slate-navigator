
import React from 'react';
import { FormLabel } from "@/components/ui/form";
import BackgroundImageSelector from '@/components/task-editor/BackgroundImageSelector';
import { Control, UseFormSetValue } from 'react-hook-form';

interface PunishmentBackgroundSectionProps {
  control: Control<any>;
  imagePreview: string | null;
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<any>;
}

const PunishmentBackgroundSection: React.FC<PunishmentBackgroundSectionProps> = ({
  control,
  imagePreview,
  onRemoveImage,
  onImageUpload,
  setValue
}) => {
  const getFocalPointX = () => {
    const value = control._getWatch ? control._getWatch('focal_point_x') : null;
    return value !== null && value !== undefined ? value : 50;
  };
  
  const getFocalPointY = () => {
    const value = control._getWatch ? control._getWatch('focal_point_y') : null;
    return value !== null && value !== undefined ? value : 50;
  };

  return (
    <div className="space-y-4">
      <FormLabel className="text-white text-lg">Background Image</FormLabel>
      <BackgroundImageSelector
        control={control}
        imagePreview={imagePreview}
        initialPosition={{
          x: getFocalPointX(),
          y: getFocalPointY()
        }}
        onRemoveImage={onRemoveImage}
        onImageUpload={onImageUpload}
        setValue={setValue}
      />
    </div>
  );
};

export default PunishmentBackgroundSection;
