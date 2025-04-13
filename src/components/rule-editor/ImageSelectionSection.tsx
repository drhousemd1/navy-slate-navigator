
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useFormContext } from 'react-hook-form';
import { useRuleCarousel } from '../carousel/RuleCarouselContext';

interface ImageSelectionSectionProps {
  imagePreview: string | null;
  setImagePreview: React.Dispatch<React.SetStateAction<string | null>>;
  selectedBoxIndex: number | null;
  setSelectedBoxIndex: React.Dispatch<React.SetStateAction<number | null>>;
  position: { x: number; y: number };
  setPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
}

const ImageSelectionSection: React.FC<ImageSelectionSectionProps> = ({
  imagePreview,
  setImagePreview,
  selectedBoxIndex,
  setSelectedBoxIndex,
  position,
  setPosition,
}) => {
  const { register, setValue, watch } = useFormContext();
  const { timer, setTimer } = useRuleCarousel();
  const background_images = watch('background_images') ?? [];

  const handleBoxClick = (index: number) => {
    setSelectedBoxIndex(index);
    setImagePreview(background_images[index] ?? null);
  };

  const handleTimerChange = (delta: number) => {
    setTimer(Math.max(1, timer + delta));
  };

  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, index) => {
          const image = background_images[index];
          return (
            <div
              key={index}
              onClick={() => handleBoxClick(index)}
              className={`w-16 h-16 border rounded cursor-pointer overflow-hidden flex items-center justify-center ${
                selectedBoxIndex === index ? 'border-blue-500 ring-2 ring-blue-500' : 'border-muted bg-dark-navy border-light-navy'
              }`}
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
        <Label className="text-xs text-white">Carousel Timer</Label>
        <div className="flex items-center gap-1">
          <Button 
            type="button" 
            onClick={() => handleTimerChange(-1)} 
            className="px-2 py-1 border border-light-navy rounded bg-dark-navy text-white"
            size="sm"
          >
            -
          </Button>
          <span className="text-sm w-8 text-center text-white">{timer}</span>
          <Button 
            type="button" 
            onClick={() => handleTimerChange(1)} 
            className="px-2 py-1 border border-light-navy rounded bg-dark-navy text-white"
            size="sm"
          >
            +
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImageSelectionSection;
