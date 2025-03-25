
import React, { useRef, useState } from 'react';
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Upload } from 'lucide-react';
import { Control } from 'react-hook-form';

interface BackgroundImageSelectorProps {
  control: Control<any>;
  imagePreview: string | null;
  position: { x: number; y: number };
  isDragging: boolean;
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
}

const BackgroundImageSelector: React.FC<BackgroundImageSelectorProps> = ({
  control,
  imagePreview,
  position,
  isDragging,
  onRemoveImage,
  onImageUpload,
  onMouseDown,
  onTouchStart
}) => {
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    console.log("Mouse down event triggered in BackgroundImageSelector");
    onMouseDown(e);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    console.log("Touch start event triggered in BackgroundImageSelector");
    onTouchStart(e);
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
        {imagePreview ? (
          <div className="space-y-4">
            <div 
              ref={imageContainerRef}
              className="relative w-full h-48 rounded-lg overflow-hidden"
              role="button"
              tabIndex={0}
              aria-label="Drag to adjust focal point"
            >
              <img 
                src={imagePreview} 
                alt="Background preview" 
                className="w-full h-full object-cover"
                style={{ 
                  opacity: control._formValues.background_opacity / 100,
                  objectPosition: `${position.x}% ${position.y}%`
                }}
              />
              {/* Interactive overlay directly handling mouse and touch events */}
              <div 
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors duration-200"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                style={{ 
                  cursor: 'crosshair',
                  position: 'absolute',
                  pointerEvents: 'auto', 
                  touchAction: 'none',
                  zIndex: 10,
                  border: '2px solid red' // Keeping the debugging border as requested
                }}
              >
                {/* Focal point indicator with pointer-events: none */}
                <div 
                  className="absolute w-8 h-8 bg-white rounded-full border-2 border-nav-active transform -translate-x-1/2 -translate-y-1/2 shadow-lg"
                  style={{ 
                    left: `${position.x}%`, 
                    top: `${position.y}%`,
                    animation: isDragging ? 'none' : 'pulse 2s infinite',
                    boxShadow: isDragging ? '0 0 0 4px rgba(126, 105, 171, 0.5)' : '',
                    zIndex: 20,
                    pointerEvents: 'none' // Ensuring the marker doesn't block input
                  }}
                />
                <span className="text-sm text-white bg-black/70 px-3 py-2 rounded-full shadow-md pointer-events-none">
                  Click and drag to adjust focal point
                </span>
              </div>
            </div>
            <Button 
              type="button"
              variant="secondary" 
              onClick={onRemoveImage}
              className="bg-dark-navy text-white hover:bg-light-navy"
            >
              Remove Image
            </Button>
          </div>
        ) : (
          <div className="relative h-32 flex flex-col items-center justify-center">
            <Upload className="h-10 w-10 text-light-navy mb-2" />
            <p className="text-light-navy">Click to upload or drag and drop</p>
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={onImageUpload}
            />
          </div>
        )}
      </div>
      
      {imagePreview && (
        <FormField
          control={control}
          name="background_opacity"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-white">Image Opacity ({field.value}%)</FormLabel>
              <FormControl>
                <Slider
                  value={[field.value]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value) => field.onChange(value[0])}
                  className="py-4"
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}
    </div>
  );
};

export default BackgroundImageSelector;
