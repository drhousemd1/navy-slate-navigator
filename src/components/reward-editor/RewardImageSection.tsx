
import React from 'react';
import { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import BackgroundImageSelector from '@/components/task-editor/BackgroundImageSelector';
import { ImageMetadata } from '@/utils/image/helpers';
import { getRewardBestImageUrl, rewardImageMetadataToJson, rewardJsonToImageMetadata } from '@/utils/image/rewardIntegration';
import { useImageUpload } from '@/hooks/useImageUpload';
import { logger } from '@/lib/logger';
import { RewardFormValues } from '@/data/rewards/types';

interface RewardImageSectionProps {
  control: Control<RewardFormValues>;
  setValue: UseFormSetValue<RewardFormValues>;
  watch: UseFormWatch<RewardFormValues>;
  imagePreview: string | null;
  setImagePreview: (url: string | null) => void;
}

const RewardImageSection: React.FC<RewardImageSectionProps> = ({
  control,
  setValue,
  watch,
  imagePreview,
  setImagePreview
}) => {
  // Get current image metadata from form
  const currentImageMeta = watch('image_meta');
  const currentImageUrl = watch('background_image_url');
  
  // Convert Json back to ImageMetadata if needed
  const imageMeta = rewardJsonToImageMetadata(currentImageMeta);

  const imageUpload = useImageUpload({
    category: 'rewards',
    onUploadComplete: (result) => {
      logger.debug('[Reward Image Section] Upload completed:', result);
      
      // Update form with new optimized data
      setValue('background_image_url', result.metadata.fullUrl || result.metadata.originalUrl);
      setValue('image_meta', rewardImageMetadataToJson(result.metadata));
      
      // Update preview
      const bestUrl = getRewardBestImageUrl(result.metadata, null, false);
      setImagePreview(bestUrl);
    },
    onUploadError: (error) => {
      logger.error('[Reward Image Section] Upload failed:', error);
    }
  });

  const handleLegacyImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Start optimized upload in background
      imageUpload.uploadImage(file);
      
      // Create immediate preview for UI responsiveness
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        // Don't set background_image_url yet - wait for optimized upload
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLegacyRemoveImage = () => {
    setValue('background_image_url', undefined);
    setValue('image_meta', null);
    setImagePreview(null);
  };

  // Use the best available image URL for display
  const displayImageUrl = getRewardBestImageUrl(imageMeta, currentImageUrl, false) || imagePreview;

  return (
    <BackgroundImageSelector
      control={control}
      imagePreview={displayImageUrl}
      initialPosition={{ 
        x: watch('focal_point_x') || 50, 
        y: watch('focal_point_y') || 50 
      }}
      onRemoveImage={handleLegacyRemoveImage}
      onImageUpload={handleLegacyImageUpload}
      setValue={setValue}
    />
  );
};

export default RewardImageSection;
