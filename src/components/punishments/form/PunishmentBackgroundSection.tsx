
import React from 'react';
import { FormLabel } from "@/components/ui/form";
import BackgroundImageSelector from '../../task-editor/BackgroundImageSelector';
import { Control, UseFormSetValue } from 'react-hook-form';
import { PunishmentFormValues } from './PunishmentFormProvider'; // Updated import

interface PunishmentBackgroundSectionProps {
  control: Control<PunishmentFormValues>; // Changed from Control<any>
  imagePreview: string | null;
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<PunishmentFormValues>; // Changed from UseFormSetValue<any>
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
      <BackgroundImageSelector
        control={control}
        imagePreview={imagePreview}
        initialPosition={{
          x: control._getWatch('focal_point_x') || 50, // Now type-checked
          y: control._getWatch('focal_point_y') || 50  // Now type-checked
        }}
        onRemoveImage={onRemoveImage}
        onImageUpload={onImageUpload}
        setValue={setValue}
      />
    </div>
  );
};

export default PunishmentBackgroundSection;
