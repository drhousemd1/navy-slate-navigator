import React, { useRef, useState, useEffect } from 'react';
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Upload } from 'lucide-react';
import { Control, UseFormSetValue } from 'react-hook-form';
import ImageFocalPointControl from '@/components/encyclopedia/image/ImageFocalPointControl';
import { logger } from '@/lib/logger';

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
  const [position, setPosition] = useState({ 
    x: initialPosition?.x ?? 50, 
    y: initialPosition?.y ?? 50 
  });
  
  // Safely initialize opacity - default to 100 if no value is available
  const [opacity, setOpacity] = useState<number>(100);

  // Initialize with defaults or existing values
  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
    }
  }, [initialPosition]);

  // This useEffect is modified to safely set the opacity value from the form
  useEffect(() => {
    try {
      // Get background_opacity from form values safely
      let formOpacity: number | undefined;
      
      // First check if we can access via _getWatch method
      if (control._getWatch && typeof control._getWatch === 'function') {
        formOpacity = control._getWatch('background_opacity');
      }
      
      // Then try to access via _formValues if available
      if (formOpacity === undefined && control._formValues) {
        formOpacity = control._formValues.background_opacity;
      }
      
      // If we have a valid opacity value from the form, use it
      if (typeof formOpacity === 'number') {
        logger.log("Setting opacity from form value:", formOpacity);
        setOpacity(formOpacity);
      } else if (imagePreview) {
        // Only set default if we have an image but no opacity value
        logger.log("Setting default opacity for new image to 100");
        setValue('background_opacity', 100);
        setOpacity(100);
      }
    } catch (error) {
      logger.error("Error setting opacity:", error);
      // Fallback to default if there's an error
      setOpacity(100);
    }
  }, [control, imagePreview, setValue]);

  const updatePosition = (clientX: number, clientY: number) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    
    // Update position state
    setPosition({ x, y });
    
    // Also update form values immediately to persist changes
    setValue('focal_point_x', Math.round(x));
    setValue('focal_point_y', Math.round(y));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    setIsDragging(true);
    updatePosition(e.touches[0].clientX, e.touches[0].clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) updatePosition(e.clientX, e.clientY);
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length > 0) {
        e.preventDefault();
        updatePosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    
    const stopDragging = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopDragging);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', stopDragging);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopDragging);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', stopDragging);
    };
  }, [isDragging, setValue]);

  const handleOpacityChange = (values: number[]) => {
    const opacityValue = values[0];
    logger.log("Slider changing opacity to:", opacityValue);
    setOpacity(opacityValue);
    setValue('background_opacity', opacityValue);
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
        {imagePreview ? (
          <div className="space-y-4">
            <div 
              ref={imageContainerRef}
              className="relative w-full h-48 rounded-lg overflow-hidden"
            >
              <ImageFocalPointControl
                imagePreview={imagePreview}
                position={position}
                opacity={opacity}
                isDragging={isDragging}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
              />
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
              <FormLabel className="text-white">Image Opacity ({opacity}%)</FormLabel>
              <FormControl>
                <Slider
                  value={[opacity]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={handleOpacityChange}
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
