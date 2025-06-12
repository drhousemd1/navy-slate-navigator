
import React, { useCallback } from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import { RewardFormValues } from '@/data/rewards/types';
import RewardBackgroundSection from './RewardBackgroundSection';
import { uploadImageWithCompression } from '@/utils/image/storage';
import { useUserIds } from '@/contexts/UserIdsContext';
import { logger } from '@/lib/logger';
import { toast } from '@/hooks/use-toast';

interface RewardImageSectionProps {
  control: Control<RewardFormValues>;
  imagePreview: string | null;
  initialPosition: { x: number; y: number };
  onRemoveImage: () => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<RewardFormValues>;
}

const RewardImageSection: React.FC<RewardImageSectionProps> = ({
  control,
  imagePreview,
  initialPosition,
  onRemoveImage,
  onImageUpload,
  setValue
}) => {
  const { subUserId } = useUserIds();

  const handleImageUploadWithCompression = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !subUserId) {
      onImageUpload(event);
      return;
    }

    try {
      logger.debug('[Reward Image] Starting compression for:', file.name);
      
      const { metadata, previewUrl } = await uploadImageWithCompression(file, {
        category: 'rewards',
        userId: subUserId,
        generateThumbnail: true,
        onProgress: (progress) => {
          logger.debug(`[Reward Image] Upload progress: ${progress}%`);
        }
      });

      // Set both the preview URL and metadata
      setValue('background_image_url', previewUrl);
      setValue('image_meta', metadata);
      
      logger.debug('[Reward Image] Compression completed:', {
        originalSize: metadata.originalSize,
        compressedSize: metadata.compressedSize,
        compressionRatio: metadata.compressionRatio
      });

      toast({
        title: "Image uploaded successfully",
        description: metadata.compressionRatio 
          ? `Compressed by ${metadata.compressionRatio.toFixed(1)}%` 
          : "Image processed",
      });

    } catch (error) {
      logger.error('[Reward Image] Compression failed:', error);
      
      // Fallback to original behavior
      onImageUpload(event);
      
      toast({
        title: "Image uploaded (uncompressed)",
        description: "Compression failed, but image was uploaded normally",
        variant: "destructive",
      });
    }
  }, [onImageUpload, setValue, subUserId]);

  const handleRemoveImageWithCleanup = useCallback(() => {
    // Clear both the URL and metadata
    setValue('background_image_url', null);
    setValue('image_meta', null);
    onRemoveImage();
  }, [onRemoveImage, setValue]);

  return (
    <RewardBackgroundSection
      control={control}
      imagePreview={imagePreview}
      initialPosition={initialPosition}
      onRemoveImage={handleRemoveImageWithCleanup}
      onImageUpload={handleImageUploadWithCompression}
      setValue={setValue}
    />
  );
};

export default RewardImageSection;
