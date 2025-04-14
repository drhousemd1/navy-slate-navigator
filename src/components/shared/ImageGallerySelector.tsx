
import React from "react";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form";
import BackgroundImageSelector from "@/components/task-editor/BackgroundImageSelector";
import { Control } from "react-hook-form";

interface ImageGallerySelectorProps {
  imageSlots: (string | null)[];
  selectedSlotIndex: number | null;
  imagePreview: string | null;
  onSelectSlot: (index: number) => void;
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: (key: string, value: any) => void;
  position: { x: number; y: number };
  control: Control<any>;
  carouselTimer?: number;
  onCarouselTimerChange?: (timer: number) => void;
}

const ImageGallerySelector: React.FC<ImageGallerySelectorProps> = ({
  imageSlots,
  selectedSlotIndex,
  imagePreview,
  onSelectSlot,
  onRemoveImage,
  onImageUpload,
  setValue,
  position,
  control,
  carouselTimer = 5,
  onCarouselTimerChange
}) => {
  const handleTimerChange = (newValue: number) => {
    if (onCarouselTimerChange) {
      onCarouselTimerChange(Math.max(1, newValue));
    }
  };

  return (
    <div className="space-y-4">
      <FormLabel className="text-white text-lg">Background Images</FormLabel>
      <div className="flex items-end justify-between mb-4">
        <div className="flex gap-2">
          {imageSlots.map((imageUrl, index) => (
            <div
              key={index}
              onClick={() => onSelectSlot(index)}
              className={`w-12 h-12 rounded-md cursor-pointer transition-all
                ${selectedSlotIndex === index
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
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMjJDMTcuNTIyOCAyMiAyMiAxNy41MjI4IDIyIDEyQzIyIDYuNDc3MTUgMTcuNTIyOCAyIDEyIDJDNi40NzcxNSAyIDIgNi40NzcxNSAyIDEyQzIgMTcuNTIyOCA2LjQ3NzE1IDIyIDEyIDIyWiIgc3Ryb2tlPSIjRjg3MTcxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTE1IDlMOSAxNSIgc3Ryb2tlPSIjRjg3MTcxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTkgOUwxNSAxNSIgc3Ryb2tlPSIjRjg3MTcxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+';
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {onCarouselTimerChange && (
          <div className="flex flex-col items-start space-y-1">
            <span className="text-sm text-white font-medium leading-tight">
              Carousel Timer
            </span>
            <span className="text-xs text-slate-400">
              (Settings will be applied to all cards)
            </span>

            <div className="flex items-center space-x-2">
              <Button
                type="button"
                size="sm"
                onClick={() => handleTimerChange(carouselTimer - 1)}
                className="px-3 py-1 bg-light-navy text-white hover:bg-navy border border-light-navy"
              >
                –
              </Button>

              <div className="w-10 text-center text-white">{carouselTimer}</div>

              <Button
                type="button"
                size="sm"
                onClick={() => handleTimerChange(carouselTimer + 1)}
                className="px-3 py-1 bg-light-navy text-white hover:bg-navy border border-light-navy"
              >
                +
              </Button>

              <span className="text-sm text-slate-400">(s)</span>
            </div>
          </div>
        )}
      </div>

      <BackgroundImageSelector
        control={control}
        imagePreview={imagePreview}
        initialPosition={position}
        onRemoveImage={onRemoveImage}
        onImageUpload={onImageUpload}
        setValue={setValue}
      />
    </div>
  );
};

export default ImageGallerySelector;
