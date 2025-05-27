
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger'; // Added logger import

export const useModalImageHandling = (initialImageUrl?: string, initialBackgroundImages?: string[]) => {
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl || null);
  const [imageSlots, setImageSlots] = useState<(string | null)[]>([null, null, null, null, null]);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number | null>(null);
  const [position, setPosition] = useState({ 
    x: 50, 
    y: 50 
  });

  useEffect(() => {
    if (initialImageUrl || initialBackgroundImages) {
      const newImageSlots = [null, null, null, null, null];
      
      if (Array.isArray(initialBackgroundImages) && initialBackgroundImages.length > 0) {
        logger.debug("Loading background_images into slots:", initialBackgroundImages); // Replaced console.log
        initialBackgroundImages.forEach((img, index) => {
          if (index < newImageSlots.length && img) {
            newImageSlots[index] = img;
          }
        });
      } else if (initialImageUrl) {
        newImageSlots[0] = initialImageUrl;
      }
      
      setImageSlots(newImageSlots);
      setImagePreview(initialImageUrl || newImageSlots[0]);
    }
  }, [initialImageUrl, initialBackgroundImages]);

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
        
        const updatedSlots = [...imageSlots];
        updatedSlots[targetIndex!] = base64String;
        setImageSlots(updatedSlots);
        setImagePreview(base64String);
        
        logger.debug(`Updated image slot ${targetIndex} and set as preview`); // Replaced console.log
      } catch (error) {
        logger.error("Error processing uploaded image:", error); // Replaced console.error
        toast({
          title: "Image Error",
          description: "There was a problem processing the uploaded image",
          variant: "destructive"
        });
      }
    };
    
    reader.onerror = (error) => {
      logger.error("FileReader error:", error); // Replaced console.error
      toast({
        title: "Upload Error",
        description: "Failed to read the image file",
        variant: "destructive"
      });
    };
    
    try {
      reader.readAsDataURL(file);
    } catch (error) {
      logger.error("Error reading file as data URL:", error); // Replaced console.error
      toast({
        title: "File Error",
        description: "Failed to read the image file",
        variant: "destructive"
      });
    }
  };
  
  const handleRemoveImage = () => {
    if (selectedBoxIndex !== null) {
      const updatedSlots = [...imageSlots];
      updatedSlots[selectedBoxIndex] = null;
      setImageSlots(updatedSlots);
      
      // Clear preview but keep the selected box highlighted
      setImagePreview(null);
      
      logger.debug(`Removed image from slot ${selectedBoxIndex}, cleared preview but kept selection`); // Replaced console.log
    } else {
      logger.debug('No slot selected for removal'); // Replaced console.log
    }
  };

  const handleSelectImageSlot = (index: number) => {
    setSelectedBoxIndex(index);
    setImagePreview(imageSlots[index]);
  };

  // Process images for saving
  const getProcessedImages = () => {
    // Validate image slots before saving
    const validImageSlots = imageSlots
      .filter(slot => typeof slot === 'string' && slot.trim() !== '')
      .map(slot => {
        // Additional validation to ensure it's a valid data URL or image URL
        if (!slot) return null;
        try {
          if (slot.startsWith('data:image') || slot.startsWith('http')) {
            return slot;
          } else {
            logger.warn("Invalid image data in slot:", slot.substring(0, 30)); // Replaced console.warn
            return null;
          }
        } catch (e) {
          logger.error("Error validating image slot:", e); // Replaced console.error
          return null;
        }
      })
      .filter(Boolean) as string[];
    
    return {
      backgroundImageUrl: imagePreview,
      backgroundImages: validImageSlots
    };
  };

  return {
    imagePreview,
    imageSlots,
    selectedBoxIndex,
    position,
    setPosition,
    handleImageUpload,
    handleRemoveImage,
    handleSelectImageSlot,
    getProcessedImages
  };
};

