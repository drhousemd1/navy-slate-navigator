
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

export const useModalImageHandling = (
  initialImageUrl?: string,
  initialBackgroundImages?: string[]
) => {
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl || null);
  const [imageSlots, setImageSlots] = useState<(string | null)[]>([null, null, null, null, null]);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number | null>(null);
  const [position, setPosition] = useState({ x: 50, y: 50 });

  useEffect(() => {
    if (initialImageUrl || initialBackgroundImages) {
      const newImageSlots = [null, null, null, null, null];

      if (Array.isArray(initialBackgroundImages)) {
        for (let i = 0; i < initialBackgroundImages.length && i < 5; i++) {
          newImageSlots[i] = initialBackgroundImages[i];
        }
      }

      setImageSlots(newImageSlots);
      setImagePreview(initialImageUrl || newImageSlots[0]);
    }
  }, [initialImageUrl, initialBackgroundImages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (selectedBoxIndex !== null) {
        const updatedSlots = [...imageSlots];
        updatedSlots[selectedBoxIndex] = result;
        setImageSlots(updatedSlots);
        setImagePreview(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    if (selectedBoxIndex !== null) {
      const updatedSlots = [...imageSlots];
      updatedSlots[selectedBoxIndex] = null;
      setImageSlots(updatedSlots);
      setImagePreview(null);
    }
  };

  return {
    imagePreview,
    imageSlots,
    selectedBoxIndex,
    position,
    setPosition,
    setSelectedBoxIndex,
    setImageSlots,
    setImagePreview,
    handleImageUpload,
    handleRemoveImage
  };
};
