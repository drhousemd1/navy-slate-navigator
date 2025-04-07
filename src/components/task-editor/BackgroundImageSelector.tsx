
import React, { useRef, useState, useEffect } from 'react';
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Upload } from 'lucide-react';
import { Control, UseFormSetValue } from 'react-hook-form';
import ImageFocalPointControl from '@/components/encyclopedia/image/ImageFocalPointControl';
import { useImageCarousel } from '@/components/throne/hooks/useImageCarousel';

interface BackgroundImageSelectorProps {
  control: Control<any>;
  imagePreview: string | null;
  initialPosition?: { x: number; y: number };
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<any>;
  imageSlots?: (string | null)[];
  carouselTimer?: number;
}

const BackgroundImageSelector: React.FC<BackgroundImageSelectorProps> = ({
  control,
  imagePreview,
  initialPosition,
  onRemoveImage,
  onImageUpload,
  setValue,
  imageSlots = [],
  carouselTimer = 5
}) => {
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ 
    x: initialPosition?.x ?? 50, 
    y: initialPosition?.y ?? 50 
  });
  
  const [opacity, setOpacity] = useState<number>(100);
  const [visibleImageIndex, setVisibleImageIndex] = useState(0);
  
  // Filter out null values from imageSlots
  const validImageSlots = (imageSlots || []).filter(Boolean) as string[];
  
  // Use the imagePreview as fallback if no valid image slots
  const actualImages = validImageSlots.length > 0 ? validImageSlots : (imagePreview ? [imagePreview] : []);
  
  // Set up the carousel effect
  useEffect(() => {
    if (actualImages.length <= 1) return;
    
    const intervalId = setInterval(() => {
      setVisibleImageIndex(prev => (prev + 1) % actualImages.length);
    }, carouselTimer * 1000);
    
    return () => clearInterval(intervalId);
  }, [carouselTimer, actualImages.length]);
  
  // Get the current visible image
  const currentImage = actualImages.length > 0 ? actualImages[visibleImageIndex] : null;

  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
    }
  }, [initialPosition]);

  useEffect(() => {
    try {
      let formOpacity: number | undefined;
      
      if (control._getWatch && typeof control._getWatch === 'function') {
        formOpacity = control._getWatch('background_opacity');
      }
      
      if (formOpacity === undefined && control._formValues) {
        formOpacity = control._formValues.background_opacity;
      }
      
      if (typeof formOpacity === 'number') {
        console.log("Setting opacity from form value:", formOpacity);
        setOpacity(formOpacity);
      } else if (imagePreview) {
        console.log("Setting default opacity for new image to 100");
        setValue('background_opacity', 100);
        setOpacity(100);
      }
    } catch (error) {
      console.error("Error setting opacity:", error);
      setOpacity(100);
    }
  }, [control, imagePreview, setValue]);

  const updatePosition = (clientX: number, clientY: number) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    
    setPosition({ x, y });
    
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
    console.log("Slider changing opacity to:", opacityValue);
    setOpacity(opacityValue);
    setValue('background_opacity', opacityValue);
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
        {currentImage ? (
          <div className="space-y-4">
            <div 
              ref={imageContainerRef}
              className="relative w-full h-48 rounded-lg overflow-hidden"
            >
              <ImageFocalPointControl
                imagePreview={currentImage}
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
      {currentImage && (
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
