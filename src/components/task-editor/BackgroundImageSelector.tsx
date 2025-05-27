import React, { useRef, useState, useEffect } from 'react';
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Upload } from 'lucide-react';
import { Control, UseFormSetValue, FieldValues, Path } from 'react-hook-form';
import ImageFocalPointControl from '@/components/encyclopedia/image/ImageFocalPointControl';
import { logger } from '@/lib/logger';

// Define an interface for the fields required by this component from the form
export interface BackgroundImageFormFields extends FieldValues {
  background_opacity: number;
  focal_point_x: number;
  focal_point_y: number;
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
  
  const [opacity, setOpacity] = useState<number>(100);

  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
    }
  }, [initialPosition]);

  useEffect(() => {
    try {
      // Ensure Path<TFormValues> is used for type safety with _getWatch
      const watchedOpacity = control._getWatch('background_opacity' as Path<TFormValues>);
      let formOpacity: number | undefined = typeof watchedOpacity === 'number' ? watchedOpacity : undefined;
      
      if (formOpacity === undefined && control._formValues) {
        const formValueOpacity = control._formValues.background_opacity;
        if (typeof formValueOpacity === 'number') {
          formOpacity = formValueOpacity;
        }
      }
      
      if (typeof formOpacity === 'number') {
        logger.debug("Setting opacity from form value:", formOpacity);
        setOpacity(formOpacity);
      } else if (imagePreview) {
        logger.debug("Setting default opacity for new image to 100");
        // Use Path<TFormValues> for type safety with setValue
        setValue('background_opacity' as Path<TFormValues>, 100 as any); // Cast 100 as any to satisfy PathValue
        setOpacity(100);
      }
    } catch (error) {
      logger.error("Error setting opacity:", error);
      setOpacity(100); // Default to 100 on error
    }
  }, [control, imagePreview, setValue]);

  const updatePosition = (clientX: number, clientY: number) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    
    setPosition({ x, y });
    
    // Use Path<TFormValues> for type safety
    setValue('focal_point_x' as Path<TFormValues>, Math.round(x) as any);
    setValue('focal_point_y' as Path<TFormValues>, Math.round(y) as any);
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
        e.preventDefault(); // Important for touch devices
        updatePosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    
    const stopDragging = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopDragging);
    // Ensure passive is false for touchmove if preventDefault is called
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', stopDragging);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopDragging);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', stopDragging);
    };
  // updatePosition is a dependency because its definition might change if its own dependencies change,
  // although in this specific case it's stable. Added it for completeness, but can be omitted if truly stable.
  }, [isDragging, setValue, updatePosition]); 

  const handleOpacityChange = (values: number[]) => {
    const opacityValue = values[0];
    logger.debug("Slider changing opacity to:", opacityValue);
    setOpacity(opacityValue);
    // Use Path<TFormValues> for type safety
    setValue('background_opacity' as Path<TFormValues>, opacityValue as any);
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
          name={'background_opacity' as Path<TFormValues>} // Use Path for name
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-white">Image Opacity ({opacity}%)</FormLabel>
              <FormControl>
                <Slider
                  // field.value might not be up-to-date if opacity state is managed separately
                  // and form value is set via setValue. Using local opacity state for slider value.
                  value={[opacity]} 
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={handleOpacityChange} // This already calls setValue
                  // onBlur={field.onBlur} // Optional: if you need blur handling
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
