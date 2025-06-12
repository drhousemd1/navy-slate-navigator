
import React from 'react';
import { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import ImageUploadSection from '@/components/common/ImageUploadSection';
import BackgroundImageSelector from '@/components/task-editor/BackgroundImageSelector';
import { ImageMetadata } from '@/utils/image/helpers';
import { getBestImageUrl, imageMetadataToJson, jsonToImageMetadata } from '@/utils/image/integration';

interface RuleImageSectionProps {
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
  imagePreview: string | null;
  setImagePreview: (url: string | null) => void;
}

const RuleImageSection: React.FC<RuleImageSectionProps> = ({
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
  const imageMeta = jsonToImageMetadata(currentImageMeta);

  const handleImageChange = (imageUrl: string | null, metadata: ImageMetadata | null) => {
    // Update form with new data
    setValue('background_image_url', imageUrl);
    setValue('image_meta', imageMetadataToJson(metadata));
    
    // Update preview
    setImagePreview(imageUrl);
  };

  const handleRemoveImage = () => {
    setValue('background_image_url', undefined);
    setValue('image_meta', null);
    setImagePreview(null);
  };

  const handleLegacyImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setValue('background_image_url', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLegacyRemoveImage = () => {
    setImagePreview(null);
    setValue('background_image_url', undefined);
  };

  return (
    <div className="space-y-6">
      {/* New optimized image upload */}
      <ImageUploadSection
        label="Background Image (Optimized)"
        currentImageUrl={currentImageUrl}
        currentImageMeta={imageMeta}
        onImageChange={handleImageChange}
        onRemoveImage={handleRemoveImage}
        category="rules"
      />

      {/* Fallback to existing BackgroundImageSelector for compatibility */}
      <div className="border-t border-light-navy pt-4">
        <BackgroundImageSelector
          control={control}
          imagePreview={imagePreview}
          initialPosition={{ 
            x: watch('focal_point_x') || 50, 
            y: watch('focal_point_y') || 50 
          }}
          onRemoveImage={handleLegacyRemoveImage}
          onImageUpload={handleLegacyImageUpload}
          setValue={setValue}
        />
      </div>
    </div>
  );
};

export default RuleImageSection;
