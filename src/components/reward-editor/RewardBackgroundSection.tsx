
import React from 'react';
import { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
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
  watch: UseFormWatch<RewardFormValues>;
}

const RewardBackgroundSection: React.FC<RewardBackgroundSectionProps> = ({
  control,
  imagePreview,
  initialPosition,
  onRemoveImage,
  onImageUpload,
  setValue,
  watch
}) => {
  const currentOpacity = watch('background_opacity');
  logger.debug("RewardBackgroundSection initializing with opacity:", currentOpacity);
  
  return (
    <div className="space-y-4">
      <FormLabel className="text-white text-lg">Background Image</FormLabel>
      <p className="text-sm text-muted-foreground pb-2">
        Add a background image to make your reward more visually appealing.
      </p>
      <RewardImageSection
        control={control}
        setValue={setValue}
        watch={watch}
        imagePreview={imagePreview}
        setImagePreview={(url) => {
          // This will be handled by the parent component through setValue
          if (url) {
            setValue('background_image_url', url);
          }
        }}
      />
    </div>
  );
};

export default RewardBackgroundSection;
