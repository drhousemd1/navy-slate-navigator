
import React from 'react';
import { FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import BackgroundImageSelector from '@/components/task-editor/BackgroundImageSelector';
import { useRewardImageCarousel } from '@/hooks/useRewardImageCarousel';
import RewardBackground from '../rewards/RewardBackground';

interface RewardBackgroundSectionProps {
  control: Control<any>;
  imagePreview: string | null;
  initialPosition: { x: number; y: number };
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
  globalCarouselIndex: number;
}

const RewardBackgroundSection: React.FC<RewardBackgroundSectionProps> = ({
  control,
  imagePreview,
  initialPosition,
  onRemoveImage,
  onImageUpload,
  setValue,
  watch,
  globalCarouselIndex
}) => {
  // Log the opacity value to verify it's being passed correctly
  const currentOpacity = watch('background_opacity') || 100;
  const focalPointX = watch('focal_point_x') || 50;
  const focalPointY = watch('focal_point_y') || 50;
  
  // Create a mock reward object for the carousel hook
  const mockReward = {
    id: 'preview',
    title: watch('title') || '',
    description: watch('description') || '',
    cost: watch('cost') || 0,
    supply: 1,
    background_image_url: imagePreview,
    background_opacity: currentOpacity,
    focal_point_x: focalPointX,
    focal_point_y: focalPointY
  };
  
  // Use the carousel hook for preview
  const {
    visibleImage,
    transitionImage,
    isTransitioning
  } = useRewardImageCarousel({ 
    reward: mockReward, 
    globalCarouselIndex 
  });
  
  return (
    <div className="space-y-4">
      <FormLabel className="block text-lg font-medium text-white">Background Image</FormLabel>
      <p className="text-sm text-muted-foreground pb-2">
        Add a background image to make your reward more visually appealing.
      </p>
      
      {/* Preview with carousel effect */}
      {imagePreview && (
        <div className="relative w-full h-48 overflow-hidden rounded-md mb-4 border border-gray-600">
          <RewardBackground
            visibleImage={visibleImage}
            transitionImage={transitionImage}
            isTransitioning={isTransitioning}
            focalPointX={focalPointX}
            focalPointY={focalPointY}
            backgroundOpacity={currentOpacity}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent z-20"></div>
        </div>
      )}
      
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
