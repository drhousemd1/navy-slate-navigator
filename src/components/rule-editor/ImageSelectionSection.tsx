
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRuleCarousel } from '@/components/carousel/RuleCarouselContext';
import { cn } from '@/lib/utils';

interface ImageSelectionSectionProps {
  imagePreview: string | null;
  setImagePreview: React.Dispatch<React.SetStateAction<string | null>>;
  selectedBoxIndex: number | null;
  setSelectedBoxIndex: React.Dispatch<React.SetStateAction<number | null>>;
  position: { x: number; y: number };
  setPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  backgroundImages?: (string | null)[];
  onBackgroundImagesChange?: (images: (string | null)[]) => void;
}

const ImageSelectionSection: React.FC<ImageSelectionSectionProps> = ({
  imagePreview,
  setImagePreview,
  selectedBoxIndex,
  setSelectedBoxIndex,
  position,
  setPosition,
  backgroundImages = [],
  onBackgroundImagesChange
}) => {
  const { timer, setTimer } = useRuleCarousel();

  const handleBoxClick = (index: number) => {
    setSelectedBoxIndex(index);
    setImagePreview(backgroundImages[index] ?? null);
  };

  const handleTimerChange = (delta: number) => {
    setTimer((prev) => Math.max(1, prev + delta));
  };

  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, index) => {
          const image = backgroundImages[index];
          return (
            <div
              key={index}
              onClick={() => handleBoxClick(index)}
              className={cn(
                "w-16 h-16 border rounded cursor-pointer overflow-hidden flex items-center justify-center",
                selectedBoxIndex === index 
                  ? "border-blue-500 ring-2 ring-blue-500" 
                  : "border-muted"
              )}
            >
              {image ? (
                <img src={image} className="object-cover w-full h-full" alt={`Slot ${index}`} />
              ) : (
                <span className="text-xs text-muted-foreground">Empty</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-1 items-end">
        <Label className="text-xs">Carousel Timer</Label>
        <div className="flex items-center gap-1">
          <button 
            type="button" 
            onClick={() => handleTimerChange(-1)} 
            className="px-2 py-1 border rounded"
          >
            -
          </button>
          <span className="text-sm w-8 text-center">{timer}</span>
          <button 
            type="button" 
            onClick={() => handleTimerChange(1)} 
            className="px-2 py-1 border rounded"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageSelectionSection;
