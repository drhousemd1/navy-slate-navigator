
import React, { useState, useEffect } from 'react';
import { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Slider } from '@/components/ui/slider';
import PunishmentImageSelectionSection from './PunishmentImageSelectionSection';
import { usePunishments } from '@/contexts/PunishmentsContext';

interface PunishmentBackgroundSectionProps {
  control: Control<any>;
  imagePreview: string | null;
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
  initialBackgroundImages?: (string | null)[];
  initialCarouselTimer?: number;
}

const PunishmentBackgroundSection: React.FC<PunishmentBackgroundSectionProps> = ({
  control,
  imagePreview,
  onRemoveImage,
  onImageUpload,
  setValue,
  watch,
  initialBackgroundImages = [],
  initialCarouselTimer = 5
}) => {
  const { globalCarouselTimer, setGlobalCarouselTimer } = usePunishments();
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number | null>(null);
  
  // Initialize image slots with the provided background images or create empty ones
  // FIXED: Now creating 5 slots instead of 4 when no initial images exist
  const [imageSlots, setImageSlots] = useState<(string | null)[]>(
    initialBackgroundImages.length > 0 
      ? [...initialBackgroundImages] 
      : imagePreview 
        ? [imagePreview, null, null, null, null] 
        : [null, null, null, null, null]
  );

  // Update slots if initialBackgroundImages changes
  useEffect(() => {
    if (initialBackgroundImages.length > 0) {
      setImageSlots([...initialBackgroundImages]);
    }
  }, [initialBackgroundImages]);

  // Update form value when image slots change
  useEffect(() => {
    setValue('background_images', imageSlots);
  }, [imageSlots, setValue]);
  
  // Set background_image_url from the selected image
  useEffect(() => {
    if (selectedBoxIndex !== null && imageSlots[selectedBoxIndex]) {
      setValue('background_image_url', imageSlots[selectedBoxIndex]);
    }
  }, [selectedBoxIndex, imageSlots, setValue]);

  const handleSelectImageSlot = (index: number) => {
    setSelectedBoxIndex(index);
  };

  const handleCarouselTimerChange = (timer: number) => {
    setValue('carousel_timer', timer);
  };

  const handleSlotImageUpdate = (imageUrl: string) => {
    if (selectedBoxIndex !== null) {
      const newSlots = [...imageSlots];
      newSlots[selectedBoxIndex] = imageUrl;
      setImageSlots(newSlots);
    }
  };

  // Handle image upload for the selected slot
  const handleSlotImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    onImageUpload(e);
    
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          handleSlotImageUpdate(event.target.result);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // Handle removing the image from the selected slot
  const handleSlotImageRemove = () => {
    if (selectedBoxIndex !== null) {
      const newSlots = [...imageSlots];
      newSlots[selectedBoxIndex] = null;
      setImageSlots(newSlots);
      onRemoveImage();
    }
  };

  return (
    <div className="space-y-6">
      <PunishmentImageSelectionSection
        imageSlots={imageSlots}
        selectedBoxIndex={selectedBoxIndex}
        carouselTimer={globalCarouselTimer}
        onCarouselTimerChange={handleCarouselTimerChange}
        onSelectImageSlot={handleSelectImageSlot}
        onRemoveImage={handleSlotImageRemove}
        onImageUpload={handleSlotImageUpload}
        setValue={setValue}
        watch={watch}
        control={control}
      />

      <FormField
        control={control}
        name="background_opacity"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Background Opacity</FormLabel>
            <FormControl>
              <div className="flex flex-col space-y-2">
                <Slider
                  value={[field.value || 50]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value) => {
                    field.onChange(value[0]);
                  }}
                  className="bg-light-navy"
                />
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">0%</span>
                  <span className="text-xs text-gray-400">100%</span>
                </div>
              </div>
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
};

export default PunishmentBackgroundSection;
