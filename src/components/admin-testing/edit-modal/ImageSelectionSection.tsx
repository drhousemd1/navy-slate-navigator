
import React from "react";
import ImageGallerySelector from "@/components/shared/ImageGallerySelector";
import { Control } from "react-hook-form";

interface ImageSelectionSectionProps {
  imagePreview: string | null;
  imageSlots: (string | null)[];
  selectedBoxIndex: number | null;
  carouselTimer: number;
  onCarouselTimerChange: (timer: number) => void;
  onSelectImageSlot: (index: number) => void;
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: (key: string, value: any) => void;
  position: { x: number; y: number };
  control: Control<any>;
}

const ImageSelectionSection: React.FC<ImageSelectionSectionProps> = ({
  imageSlots,
  selectedBoxIndex,
  carouselTimer,
  onCarouselTimerChange,
  onSelectImageSlot,
  onRemoveImage,
  onImageUpload,
  setValue,
  position,
  control,
  imagePreview
}) => {
  console.log("ImageSelectionSection rendering with:", {
    selectedBoxIndex,
    hasCurrentImage: Boolean(imagePreview),
    imageSlotCount: imageSlots.length,
    nonEmptySlots: imageSlots.filter(Boolean).length
  });

  return (
    <ImageGallerySelector
      imageSlots={imageSlots}
      selectedSlotIndex={selectedBoxIndex}
      imagePreview={imagePreview}
      onSelectSlot={onSelectImageSlot}
      onRemoveImage={onRemoveImage}
      onImageUpload={onImageUpload}
      setValue={setValue}
      position={position}
      control={control}
      carouselTimer={carouselTimer}
      onCarouselTimerChange={onCarouselTimerChange}
    />
  );
};

export default ImageSelectionSection;
