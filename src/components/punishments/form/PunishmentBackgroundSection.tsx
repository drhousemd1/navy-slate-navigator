
import React from 'react';
import { FormLabel } from "@/components/ui/form";
import BackgroundImageSelector from '../../task-editor/BackgroundImageSelector';
import { Control } from 'react-hook-form';
import { PunishmentFormValues } from './PunishmentFormProvider'; // Assuming this exists and is correct
import { UseFormSetValue } from 'react-hook-form';

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
  // Fields used by BackgroundImageSelector: focal_point_x, focal_point_y, background_image_url, background_opacity
  // PunishmentFormValues should contain these fields.
  // Casting to `any` is a temporary workaround for TS2589 if PunishmentFormValues is too complex,
  // or if BackgroundImageSelector expects a different form value type (e.g., TaskFormValues).
  // A better fix involves aligning the types or creating a compatible adapter for setValue.
  const compatibleSetValue = setValue as UseFormSetValue<any>; // Temporary cast

  return (
    <div className="space-y-4">
      <FormLabel className="text-white text-lg">Background Image</FormLabel>
      <BackgroundImageSelector
        control={control as Control<any>} // Temporary cast
        imagePreview={imagePreview}
        initialPosition={{
          x: control._getWatch('focal_point_x') || 50,
          y: control._getWatch('focal_point_y') || 50
        }}
        onRemoveImage={onRemoveImage}
        onImageUpload={onImageUpload}
        setValue={compatibleSetValue} // Use the casted setValue
      />
    </div>
  );
};

export default PunishmentBackgroundSection;

