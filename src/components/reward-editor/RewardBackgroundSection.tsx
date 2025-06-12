
import React, { useState } from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import { RewardFormValues } from '@/data/rewards/types';
import RewardImageSection from './RewardImageSection';
import { FormLabel } from '@/components/ui/form';
import { logger } from '@/lib/logger';

interface RewardBackgroundSectionProps {
  control: Control<RewardFormValues>;
  imagePreview: string | null;
  initialPosition: { x: number; y: number };
  onRemoveImage: () => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<RewardFormValues>;
}

const RewardBackgroundSection: React.FC<RewardBackgroundSectionProps> = ({
  control,
  imagePreview,
  initialPosition,
  onRemoveImage,
  onImageUpload,
  setValue
}) => {
  // Create local state for image preview to work with the new component
  const [localImagePreview, setLocalImagePreview] = useState<string | null>(imagePreview);
  
  const currentOpacity = control._formValues?.background_opacity; 
  logger.debug("RewardBackgroundSection initializing with opacity:", currentOpacity);
  
  // Update local preview when prop changes
  React.useEffect(() => {
    setLocalImagePreview(imagePreview);
  }, [imagePreview]);
  
  return (
    <div className="space-y-4">
      <FormLabel className="text-white text-lg">Background Image</FormLabel>
      <p className="text-sm text-muted-foreground pb-2">
        Add a background image to make your reward more visually appealing.
      </p>
      <RewardImageSection
        control={control}
        setValue={setValue}
        watch={control._formValues ? (() => (key: string) => control._formValues[key]) : (() => () => null)}
        imagePreview={localImagePreview}
        setImagePreview={setLocalImagePreview}
      />
    </div>
  );
};

export default RewardBackgroundSection;
