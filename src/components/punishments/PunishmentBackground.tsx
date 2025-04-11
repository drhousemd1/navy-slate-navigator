import React from "react";
import BackgroundImageSelector from "@/components/task-editor/BackgroundImageSelector";
import { Control } from "react-hook-form";

interface PunishmentBackgroundSectionProps {
  control: Control<any>;
  imageSlots?: (string | null)[];
  selectedBoxIndex: number | null;
  carouselTimer: number;
  onCarouselTimerChange: (timer: number) => void;
  onSelectImageSlot: (index: number) => void;
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: (key: string, value: any) => void;
  position: { x: number; y: number };
}

const PunishmentBackgroundSection: React.FC<PunishmentBackgroundSectionProps> = ({
  control,
  imageSlots = [],
  selectedBoxIndex,
  carouselTimer,
  onCarouselTimerChange,
  onSelectImageSlot,
  onRemoveImage,
  onImageUpload,
  setValue,
  position
}) => {
  const safeIndex =
    typeof selectedBoxIndex === "number" &&
    selectedBoxIndex >= 0 &&
    selectedBoxIndex < imageSlots.length;

  const currentImage = safeIndex ? imageSlots[selectedBoxIndex] : null;

  return (
    <div className="space-y-4">
      <label className="text-white text-lg">Background Images</label>
      <BackgroundImageSelector
        control={control}
        imageSlots={imageSlots}
        selectedBoxIndex={selectedBoxIndex ?? 0}
        carouselTimer={carouselTimer}
        onCarouselTimerChange={onCarouselTimerChange}
        onSelectImageSlot={onSelectImageSlot}
        onRemoveImage={onRemoveImage}
        onImageUpload={onImageUpload}
        setValue={setValue}
        position={position}
        currentImage={currentImage}
      />
    </div>
  );
};

export default PunishmentBackgroundSection;