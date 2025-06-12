
import React from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import BackgroundImageSelector from '@/components/task-editor/BackgroundImageSelector';
import { handleImageUpload } from '@/utils/image/rewardIntegration';
import { RewardFormValues } from '@/data/rewards/types';

interface RewardImageSectionProps {
  control: Control<RewardFormValues>;
  imagePreview: string | null;
  initialPosition?: { x: number; y: number };
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<RewardFormValues>;
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
