import React from 'react';
import { FormLabel } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import BackgroundImageSelector from '@/components/task-editor/BackgroundImageSelector';
import { usePunishments } from '@/contexts/PunishmentsContext';

interface PunishmentImageSelectionSectionProps {
  imageSlots: (string | null)[];
  selectedBoxIndex: number | null;
  carouselTimer: number;
  onCarouselTimerChange: (timer: number) => void;
  onSelectImageSlot: (index: number) => void;
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
  control: Control<any>;
}

const PunishmentImageSelectionSection: React.FC<PunishmentImageSelectionSectionProps> = ({
  imageSlots,
  selectedBoxIndex,
  carouselTimer,
  onCarouselTimerChange,
  onSelectImageSlot,
  onRemoveImage,
  onImageUpload,
  setValue,
  watch,
  control
}) => {
  const { globalCarouselTimer, setGlobalCarouselTimer } = usePunishments();
  const currentImage = selectedBoxIndex !== null ? imageSlots[selectedBoxIndex] : null;
  
  // Get position from form values for the selected image
  const position = {
    x: watch('focal_point_x') || 50,
    y: watch('focal_point_y') || 50
  };

  // Update both local and global carousel timer
  const handleTimerChange = (newTimer: number) => {
    onCarouselTimerChange(newTimer);
    setGlobalCarouselTimer(newTimer);
  };

  return (
    <div className="space-y-4">
      <FormLabel className="text-white text-lg">Background Images</FormLabel>
      <div className="flex items-end justify-between mb-4">
        <div className="flex gap-2">
          {imageSlots.map((imageUrl, index) => (
            <div
              key={index}
              onClick={() => onSelectImageSlot(index)}
              className={`w-12 h-12 rounded-md cursor-pointer transition-all
                ${selectedBoxIndex === index
                  ? 'border-[2px] border-[#FEF7CD] shadow-[0_0_8px_2px_rgba(254,247,205,0.6)]'
                  : 'bg-dark-navy border border-light-navy hover:border-white'}
              `}
            >
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={`Image ${index + 1}`}
                  className="w-full h-full object-cover rounded-md"
                  onError={(e) => {
                    console.error(`Error loading image in slot ${index}`);
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMjJDMTcuNTIyOCAyMiAyMiAxNy41MjI4IDIyIDEyQzIyIDYuNDc3MTUgMTcuNTIyOCAyIDIgNi40NzcxNSAyIDIgNi40NzcxNSAyIDEyQzIgMTcuNTIyOCA2LjQ3NzE1IDIyIDEyIDIyWiIgc3Ryb2tlPSIjRjg3MTcxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTE1IDlMOSAxNSIgc3Ryb2tlPSIjRjg3MTcxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTkgOUwxNSAxNSIgc3Ryb2tlPSIjRjg3MTcxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+';
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-start space-y-1">
          <span className="text-sm text-white font-medium leading-tight">
            Carousel Timer
          </span>
          <span className="text-xs text-slate-400">
            (Time between image transitions)
          </span>

          <div className="flex items-center space-x-2">
            <Button
              type="button"
              size="sm"
              onClick={() => handleTimerChange(Math.max(1, globalCarouselTimer - 1))}
              className="px-3 py-1 bg-light-navy text-white hover:bg-navy border border-light-navy"
            >
              –
            </Button>

            <div className="w-10 text-center text-white">{globalCarouselTimer}</div>

            <Button
              type="button"
              size="sm"
              onClick={() => handleTimerChange(globalCarouselTimer + 1)}
              className="px-3 py-1 bg-light-navy text-white hover:bg-navy border border-light-navy"
            >
              +
            </Button>

            <span className="text-sm text-slate-400">(s)</span>
          </div>
        </div>
      </div>

      <BackgroundImageSelector
        control={control}
        imagePreview={currentImage}
        initialPosition={position}
        onRemoveImage={onRemoveImage}
        onImageUpload={onImageUpload}
        setValue={setValue}
      />
    </div>
  );
};

export default PunishmentImageSelectionSection;
