
import React, { useEffect } from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import { FormLabel } from "@/components/ui/form";
import BackgroundImageSelector from '../task-editor/BackgroundImageSelector';

interface RewardBackgroundSectionProps {
  control: Control<any>;
  imagePreview: string | null;
  initialPosition?: { x: number; y: number };
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
  // We need to explicitly set background_image_url to null to ensure it's removed from the database
  const handleRemoveImage = () => {
    setValue('background_image_url', null);
    onRemoveImage();
  };

  // Force static opacity for testing
  useEffect(() => {
    if (imagePreview) {
      console.log("Setting static opacity to 50 for testing");
      setValue('background_opacity', 50);
    }
  }, [imagePreview, setValue]);

  return (
    <div className="space-y-4">
      <FormLabel className="text-white text-lg">Background Image</FormLabel>
      <BackgroundImageSelector
        control={control}
        imagePreview={imagePreview}
        initialPosition={initialPosition}
        onRemoveImage={handleRemoveImage}
        onImageUpload={onImageUpload}
        setValue={setValue}
      />
    </div>
  );
};

export default RewardBackgroundSection;
