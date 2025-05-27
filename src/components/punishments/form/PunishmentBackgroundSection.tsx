
import React from 'react';
import { FormLabel } from "@/components/ui/form";
// import BackgroundImageSelector from '../../task-editor/BackgroundImageSelector'; // Old import
import PunishmentBackgroundImageSelector from './PunishmentBackgroundImageSelector'; // New import
import { Control, UseFormSetValue } from 'react-hook-form';
import { PunishmentFormValues } from './PunishmentFormProvider'; 

interface PunishmentBackgroundSectionProps {
  control: Control<PunishmentFormValues>; 
  imagePreview: string | null;
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<PunishmentFormValues>; 
}

const PunishmentBackgroundSection: React.FC<PunishmentBackgroundSectionProps> = ({
  control,
  imagePreview,
  onRemoveImage,
  onImageUpload,
  setValue
}) => {
  return (
    <div className="space-y-4">
      <FormLabel className="text-white text-lg">Background Image</FormLabel>
      <PunishmentBackgroundImageSelector
        control={control}
        imagePreview={imagePreview}
        initialPosition={{
          x: control.watch('focal_point_x') ?? 50, // Phase 2: Replaced _getWatch with watch
          y: control.watch('focal_point_y') ?? 50  // Phase 2: Replaced _getWatch with watch
        }}
        onRemoveImage={onRemoveImage}
        onImageUpload={onImageUpload}
        setValue={setValue}
      />
    </div>
  );
};

export default PunishmentBackgroundSection;
