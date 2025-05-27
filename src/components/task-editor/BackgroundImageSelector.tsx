import React, { useRef, useState, useEffect } from 'react';
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Upload } from 'lucide-react';
import { Control, UseFormSetValue, FieldValues, Path, PathValue } from 'react-hook-form';
import ImageFocalPointControl from '@/components/encyclopedia/image/ImageFocalPointControl';
import { logger } from '@/lib/logger';

// Define an interface for the fields required by this component from the form
export interface BackgroundImageFormFields extends FieldValues {
  background_opacity?: number; // Made optional
  focal_point_x?: number;      // Made optional
  focal_point_y?: number;      // Made optional
}

interface BackgroundImageSelectorProps<TFormValues extends BackgroundImageFormFields> {
  control: Control<TFormValues>;
  imagePreview: string | null;
  initialPosition?: { x: number; y: number };
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<TFormValues>;
}

const BackgroundImageSelector = <TFormValues extends BackgroundImageFormFields>({
  control,
  imagePreview,
  initialPosition,
  onRemoveImage,
  onImageUpload,
  setValue
}: BackgroundImageSelectorProps<TFormValues>) => {
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({
    x: initialPosition?.x ?? 50,
    y: initialPosition?.y ?? 50
  });
  
  const [opacity, setOpacity] = useState<number>(
    // Initialize with form value if available, otherwise default to 100
    typeof control._getWatch('background_opacity' as Path<TFormValues>) === 'number' 
      ? control._getWatch('background_opacity' as Path<TFormValues>) as number 
      : 100 
  );

  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
    }
  }, [initialPosition]);

  useEffect(() => {
    try {
      const watchedOpacity = control._getWatch('background_opacity' as Path<TFormValues>);
      let formOpacity: number | undefined = typeof watchedOpacity === 'number' ? watchedOpacity : undefined;
      
      if (formOpacity === undefined && control._formValues && typeof control._formValues.background_opacity === 'number') {
        formOpacity = control._formValues.background_opacity;
      }
      
      if (typeof formOpacity === 'number') {
        logger.debug("Setting opacity from form value:", formOpacity);
        setOpacity(formOpacity);
      } else if (imagePreview && opacity !== 100) { // Only set default if opacity isn't already set or image changes
        logger.debug("Setting default opacity for new image to 100, as form value is not set.");
        setValue('background_opacity' as Path<TFormValues>, 100 as PathValue<TFormValues, Path<TFormValues>>);
        setOpacity(100);
      } else if (!imagePreview) {
        // Optionally reset or handle opacity when image is removed
        // For now, we keep the current opacity or let the form control it.
      }
    } catch (error) {
      logger.error("Error setting opacity:", error);
      setOpacity(100); // Default to 100 on error
    }
  }, [control, imagePreview, setValue, opacity]);

  const updatePosition = React.useCallback((clientX: number, clientY: number) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    
    setPosition({ x, y });
    
    setValue('focal_point_x' as Path<TFormValues>, Math.round(x) as PathValue<TFormValues, Path<TFormValues>>);
    setValue('focal_point_y' as Path<TFormValues>, Math.round(y) as PathValue<TFormValues, Path<TFormValues>>);
  }, [setValue]); // Added setValue to dependency array for useCallback

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
  }, [isDragging, updatePosition]); // updatePosition is now memoized with useCallback

  const handleOpacityChange = (values: number[]) => {
    const opacityValue = values[0];
    logger.debug("Slider changing opacity to:", opacityValue);
    setOpacity(opacityValue);
    setValue('background_opacity' as Path<TFormValues>, opacityValue as PathValue<TFormValues, Path<TFormValues>>);
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
                opacity={opacity} // Use local state opacity for visual consistency
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
          name={'background_opacity' as Path<TFormValues>}
          render={({ field }) => ( // field here includes value, onChange, onBlur, ref, etc.
            <FormItem className="space-y-2">
              <FormLabel className="text-white">Image Opacity ({Math.round(opacity)}%)</FormLabel>
              <FormControl>
                <Slider
                  // Use the local 'opacity' state for the slider's value for immediate UI feedback.
                  // The form value is updated via `handleOpacityChange` which calls `setValue`.
                  value={[opacity]} 
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={handleOpacityChange} 
                  // field.onBlur can be added if blur-specific logic is needed
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
