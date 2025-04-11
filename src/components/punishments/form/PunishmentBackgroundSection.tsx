
import React, { useState, useEffect } from 'react';
import { FormLabel } from "@/components/ui/form";
import { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import PunishmentImageSelectionSection from './PunishmentImageSelectionSection';

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
  // Initialize image slots with 5 placeholders
  const [imageSlots, setImageSlots] = useState<(string | null)[]>([null, null, null, null, null]);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number | null>(null);
  const [carouselTimer, setCarouselTimer] = useState(initialCarouselTimer);

  // Initialize image slots from initialBackgroundImages or single imagePreview
  useEffect(() => {
    const newImageSlots = [null, null, null, null, null];
    
    if (initialBackgroundImages && initialBackgroundImages.length > 0) {
      // Load images from the array
      initialBackgroundImages.forEach((img, index) => {
        if (index < newImageSlots.length && img) {
          newImageSlots[index] = img;
        }
      });
    } else if (imagePreview) {
      // If no array but single image exists, put it in the first slot
      newImageSlots[0] = imagePreview;
    }
    
    setImageSlots(newImageSlots);
    
    // Select the first non-empty slot or the first slot if all empty
    const firstImageIndex = newImageSlots.findIndex(img => img !== null);
    setSelectedBoxIndex(firstImageIndex >= 0 ? firstImageIndex : 0);
  }, []);

  // Update form value when carousel timer changes
  const handleCarouselTimerChange = (timer: number) => {
    setCarouselTimer(timer);
    setValue('carousel_timer', timer);
  };

  // Handle image slot selection
  const handleSelectImageSlot = (index: number) => {
    setSelectedBoxIndex(index);
    
    // If the slot has an image, update the form's background_image_url
    if (imageSlots[index]) {
      setValue('background_image_url', imageSlots[index]);
    }
  };

  // Override image upload handler to update slots
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // If no box selected, auto-select the first empty slot
    let targetIndex = selectedBoxIndex;
    if (targetIndex === null) {
      const firstEmpty = imageSlots.findIndex((slot) => !slot);
      if (firstEmpty === -1) {
        // All slots are full, select the first one
        targetIndex = 0;
      } else {
        targetIndex = firstEmpty;
      }
      setSelectedBoxIndex(targetIndex);
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const base64String = reader.result as string;
        console.log(`Image loaded, size: ${Math.round(base64String.length / 1024)}KB`);
        
        const updatedSlots = [...imageSlots];
        updatedSlots[targetIndex!] = base64String;
        setImageSlots(updatedSlots);
        
        // Update form values for background_image_url and background_images
        setValue('background_image_url', base64String);
        setValue('background_images', updatedSlots.filter(Boolean));
        
        // Call the original onImageUpload for compatibility
        onImageUpload(e);
      } catch (error) {
        console.error("Error processing uploaded image:", error);
      }
    };
    
    try {
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error reading file as data URL:", error);
    }
  };

  // Override image removal to update slots
  const handleRemoveImage = () => {
    if (selectedBoxIndex !== null) {
      const updatedSlots = [...imageSlots];
      updatedSlots[selectedBoxIndex] = null;
      setImageSlots(updatedSlots);
      
      // Update form values
      setValue('background_images', updatedSlots.filter(Boolean));
      
      // Set background_image_url to the first available image or null
      const firstAvailableImage = updatedSlots.find(img => img !== null) || null;
      setValue('background_image_url', firstAvailableImage);
      
      // Call original handler
      onRemoveImage();
    }
  };

  return (
    <div className="space-y-4">
      <PunishmentImageSelectionSection
        imageSlots={imageSlots}
        selectedBoxIndex={selectedBoxIndex}
        carouselTimer={carouselTimer}
        onCarouselTimerChange={handleCarouselTimerChange}
        onSelectImageSlot={handleSelectImageSlot}
        onRemoveImage={handleRemoveImage}
        onImageUpload={handleImageUpload}
        setValue={setValue}
        watch={watch}
        control={control}
      />
    </div>
  );
};

export default PunishmentBackgroundSection;
