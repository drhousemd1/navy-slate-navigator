
import React from 'react';
import { FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Control, UseFormSetValue } from 'react-hook-form';
import BackgroundImageSelector from '@/components/task-editor/BackgroundImageSelector';
import { logger } from '@/lib/logger'; // keep existing import

interface RewardBackgroundSectionProps {
  control: Control<any>;
  imagePreview: string | null;
  initialPosition: { x: number; y: number };
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<any>;
}

const RewardBackgroundSection: React.FC<RewardBackgroundSectionProps> = ({
  control,
  imagePreview,
  initialPosition,
  onRemoveImage,
  onImageUpload,
  setValue
}) => {
  // Log the opacity value to verify it's being passed correctly
  const currentOpacity = control._formValues?.background_opacity;
  logger.log("RewardBackgroundSection initializing with opacity:", currentOpacity); // Replaced console.log
  
  return (
    <div className="space-y-4">
      <FormLabel className="block text-lg font-medium text-white">Background Image</FormLabel>
      <p className="text-sm text-muted-foreground pb-2">
        Add a background image to make your reward more visually appealing.
      </p>
      <FormField
        control={control}
        name="background_image"
        render={() => (
          <FormItem>
            <BackgroundImageSelector
              control={control}
              imagePreview={imagePreview}
              initialPosition={initialPosition}
              onRemoveImage={onRemoveImage}
              onImageUpload={onImageUpload}
              setValue={setValue}
            />
          </FormItem>
        )}
      />
    </div>
  );
};

export default RewardBackgroundSection;
