
import React, { useRef, useState, useEffect } from 'react';
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Upload } from 'lucide-react';
import { Control, UseFormSetValue } from 'react-hook-form';

interface BackgroundImageSelectorProps {
  control: Control<any>;
  imagePreview: string | null;
  initialPosition?: { x: number; y: number };
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<any>;
}

const BackgroundImageSelector: React.FC<BackgroundImageSelectorProps> = ({
  control,
  imagePreview,
  initialPosition,
  onRemoveImage,
  onImageUpload,
  setValue
}) => {
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: initialPosition?.x ?? 50, y: initialPosition?.y ?? 50 });

  // Update local position state when prop changes (e.g., when form loads with initial data)
  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
    }
  }, [initialPosition]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageContainerRef.current) return;
    
    e.preventDefault();
    setIsDragging(true);
    
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    
    setPosition({ x, y });
    setValue('focal_point_x', Math.round(x));
    setValue('focal_point_y', Math.round(y));
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging || !imageContainerRef.current) return;
      
      const rect = imageContainerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((moveEvent.clientY - rect.top) / rect.height) * 100));
      
      setPosition({ x, y });
      setValue('focal_point_x', Math.round(x));
      setValue('focal_point_y', Math.round(y));
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!imageContainerRef.current || e.touches.length === 0) return;
    
    setIsDragging(true);
    
    const touch = e.touches[0];
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
    
    setPosition({ x, y });
    setValue('focal_point_x', Math.round(x));
    setValue('focal_point_y', Math.round(y));
    
    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (!isDragging || !imageContainerRef.current || moveEvent.touches.length === 0) return;
      
      moveEvent.preventDefault();
      
      const touch = moveEvent.touches[0];
      const rect = imageContainerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
      
      setPosition({ x, y });
      setValue('focal_point_x', Math.round(x));
      setValue('focal_point_y', Math.round(y));
    };
    
    const handleTouchEnd = () => {
      setIsDragging(false);
      document.removeEventListener('touchmove', handleTouchMove, { passive: false } as AddEventListenerOptions);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchmove', handleTouchMove, { passive: false } as AddEventListenerOptions);
    document.addEventListener('touchend', handleTouchEnd);
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
