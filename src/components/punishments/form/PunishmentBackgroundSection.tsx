
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
  
  // Ensure we always have exactly 5 slots by padding any existing arrays
  const ensureExactlyFiveSlots = (slots: (string | null)[]) => {
    // Copy the array to avoid mutation
    const result = [...slots];
    
    // If less than 5 slots, pad with nulls
    while (result.length < 5) {
      result.push(null);
    }
    
    // If more than 5 slots (unlikely), truncate
    return result.slice(0, 5);
  };
  
  // Initialize image slots with the provided background images (padded to 5) or create empty ones
  const [imageSlots, setImageSlots] = useState<(string | null)[]>(
    initialBackgroundImages.length > 0 
      ? ensureExactlyFiveSlots(initialBackgroundImages)
      : imagePreview 
        ? [imagePreview, null, null, null, null] 
        : [null, null, null, null, null]
  );

  // Update slots if initialBackgroundImages changes, ensuring we have 5 slots
  useEffect(() => {
    if (initialBackgroundImages.length > 0) {
      setImageSlots(ensureExactlyFiveSlots(initialBackgroundImages));
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
        watch={form.watch}
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
