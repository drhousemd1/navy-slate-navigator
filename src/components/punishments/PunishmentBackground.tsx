import React from "react";
import { FormLabel } from "@/components/ui/form";
import BackgroundImageSelector from "@/components/task-editor/BackgroundImageSelector";
import { Control } from "react-hook-form";

interface PunishmentBackgroundSectionProps {
  control: Control<any>;
  imageSlots: (string | null)[];
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
  imageSlots,
  selectedBoxIndex,
  carouselTimer,
  onCarouselTimerChange,
  onSelectImageSlot,
  onRemoveImage,
  onImageUpload,
  setValue,
  position
}) => {
  const currentImage = selectedBoxIndex !== null ? imageSlots[selectedBoxIndex] : null;

  return (
    <div className="space-y-4">
      <FormLabel className="text-white text-lg">Background Images</FormLabel>
      <BackgroundImageSelector
        imageSlots={imageSlots}
        selectedBoxIndex={selectedBoxIndex}
        onSelectImageSlot={onSelectImageSlot}
        onImageUpload={onImageUpload}
        onRemoveImage={onRemoveImage}
        currentImage={currentImage}
        control={control}
        initialPosition={position}
        setValue={setValue}
      />
      <div className="flex flex-col space-y-2">
        <FormLabel className="text-white">Carousel Timer (seconds)</FormLabel>
        <input
          type="range"
          min={3}
          max={15}
          step={1}
          value={carouselTimer}
          onChange={(e) => onCarouselTimerChange(Number(e.target.value))}
          className="w-full"
        />
        <div className="text-white text-sm">{carouselTimer} seconds</div>
      </div>
    </div>
  );
};

export default PunishmentBackgroundSection;