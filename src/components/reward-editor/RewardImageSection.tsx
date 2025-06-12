
import React from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import BackgroundImageSelector from '@/components/task-editor/BackgroundImageSelector';
import { handleImageUpload } from '@/utils/image/rewardIntegration';

// Define local interface to avoid circular dependency
interface RewardImageFormFields {
  background_image_url: string | null;
  background_opacity: number;
  focal_point_x: number;
  focal_point_y: number;
  image_meta?: any;
}

interface RewardImageSectionProps {
  control: Control<RewardImageFormFields>;
  imagePreview: string | null;
  initialPosition?: { x: number; y: number };
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<RewardImageFormFields>;
  setImagePreview: (url: string | null) => void;
}

const RewardImageSection: React.FC<RewardImageSectionProps> = ({
  control,
  imagePreview,
  initialPosition,
  onRemoveImage,
  setValue,
  setImagePreview
}) => {
  const handleImageUploadWrapper = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await handleImageUpload(file, setValue, setImagePreview);
      } catch (error) {
        console.error('Error handling image upload:', error);
      }
    }
  };

  return (
    <BackgroundImageSelector
      control={control}
      imagePreview={imagePreview}
      initialPosition={initialPosition}
      onRemoveImage={onRemoveImage}
      onImageUpload={handleImageUploadWrapper}
      setValue={setValue}
    />
  );
};

export default RewardImageSection;
