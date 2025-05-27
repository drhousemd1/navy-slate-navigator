
import React from 'react';
import { FormLabel } from "@/components/ui/form";
import PunishmentBackgroundImageSelector from './PunishmentBackgroundImageSelector';
import { Control, UseFormSetValue, useWatch } from 'react-hook-form'; // Import useWatch
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
  // Use useWatch to get the values for focal points
  const focalPointX = useWatch({
    control,
    name: 'focal_point_x',
    defaultValue: 50 // Provide a default value
  });

  const focalPointY = useWatch({
    control,
    name: 'focal_point_y',
    defaultValue: 50 // Provide a default value
  });

  return (
    <div className="space-y-4">
      <FormLabel className="text-white text-lg">Background Image</FormLabel>
      <PunishmentBackgroundImageSelector
        control={control}
        imagePreview={imagePreview}
        initialPosition={{
          x: focalPointX ?? 50, // Use the watched value
          y: focalPointY ?? 50  // Use the watched value
        }}
        onRemoveImage={onRemoveImage}
        onImageUpload={onImageUpload}
        setValue={setValue}
      />
    </div>
  );
};

export default PunishmentBackgroundSection;
