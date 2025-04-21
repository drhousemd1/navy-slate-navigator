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
  
  const ensureExactlyFiveSlots = (slots: (string | null)[]) => {
    const result = [...slots];
    while (result.length < 5) {
      result.push(null);
    }
    return result.slice(0, 5);
  };
  
  const [imageSlots, setImageSlots] = useState<(string | null)[]>(
    initialBackgroundImages.length > 0 
      ? ensureExactlyFiveSlots(initialBackgroundImages)
      : imagePreview 
        ? [imagePreview, null, null, null, null] 
        : [null, null, null, null, null]
  );

  useEffect(() => {
    if (initialBackgroundImages.length > 0) {
      setImageSlots(ensureExactlyFiveSlots(initialBackgroundImages));
    }
  }, [initialBackgroundImages]);

  useEffect(() => {
    setValue('background_images', imageSlots);
  }, [imageSlots, setValue]);
  
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
