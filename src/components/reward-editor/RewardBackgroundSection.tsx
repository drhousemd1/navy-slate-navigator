
import React from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import { RewardFormValues } from '@/data/rewards/types';
import BackgroundImageSelector from '@/components/task-editor/BackgroundImageSelector'; // Path might need adjustment if it's in a different relative location
import { FormLabel } from '@/components/ui/form';
import { logger } from '@/lib/logger';

interface RewardBackgroundSectionProps {
  control: Control<RewardFormValues>;
  imagePreview: string | null;
  initialPosition: { x: number; y: number }; // This is passed from RewardEditorForm
  onRemoveImage: () => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<RewardFormValues>;
}

const RewardBackgroundSection: React.FC<RewardBackgroundSectionProps> = ({
  control,
  imagePreview,
  initialPosition, // initialPosition is used by BackgroundImageSelector
  onRemoveImage,
  onImageUpload,
  setValue
}) => {
  const currentOpacity = control._formValues?.background_opacity; // Direct access for logging
  logger.debug("RewardBackgroundSection initializing with opacity:", currentOpacity);
  
  return (
    <div className="space-y-4">
      <FormLabel className="text-white text-lg">Background Image</FormLabel>
      <p className="text-sm text-muted-foreground pb-2">
        Add a background image to make your reward more visually appealing.
      </p>
      <BackgroundImageSelector<RewardFormValues> // Specify the type argument
        control={control}
        imagePreview={imagePreview}
        initialPosition={initialPosition} // Pass this through
        onRemoveImage={onRemoveImage}
        onImageUpload={onImageUpload}
        setValue={setValue}
      />
    </div>
  );
};

export default RewardBackgroundSection;

