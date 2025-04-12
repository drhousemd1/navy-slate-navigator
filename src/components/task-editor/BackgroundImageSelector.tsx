import React, { useState, useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Image, Upload, X } from 'lucide-react';

interface BackgroundImageSelectorProps {
  imagePreview: string | null;
  initialPosition: { x: number; y: number };
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: (name: string, value: any, options?: any) => void;
  control: any;
}

const BackgroundImageSelector: React.FC<BackgroundImageSelectorProps> = ({
  imagePreview,
  initialPosition,
  onRemoveImage,
  onImageUpload,
  setValue,
  control
}) => {
  const [position, setPosition] = useState(initialPosition);
  const { register } = useFormContext();

  React.useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition.x, initialPosition.y]);

  const handlePositionChange = useCallback(
    (newPosition: number[]) => {
      const x = newPosition[0];
      const y = newPosition[1];
      setPosition({ x, y });
      setValue('focal_point_x', x);
      setValue('focal_point_y', y);
    },
    [setValue]
  );

  return (
    <div className="space-y-2">
      <FormLabel className="text-white">Preview</FormLabel>
      <FormControl>
        <div className="relative h-64 rounded-lg overflow-hidden bg-dark-navy">
          {imagePreview ? (
            <div
              className="w-full h-full bg-cover bg-center relative"
              style={{
                backgroundImage: `url(${imagePreview})`,
                backgroundPosition: `${position.x}% ${position.y}%`,
                transition: 'opacity 2s ease-in-out'
              }}
            >
              <div className="absolute bottom-2 left-2 right-2 bg-black/50 text-white text-xs p-1 rounded-md flex items-center justify-between">
                <span className="ml-1">Focal Point: X {position.x}%, Y {position.y}%</span>
                <button 
                  type="button"
                  onClick={onRemoveImage}
                  className="hover:bg-red-500/20 p-1 -mr-1.5 rounded-sm transition-colors"
                >
                  <X className="h-3.5 w-3.5" aria-label="Remove image" />
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-light-navy">
              <Image className="h-6 w-6 mb-2" aria-hidden={true} />
              No background image
            </div>
          )}
        </div>
      </FormControl>
      <FormDescription className="text-white">
        Upload a background image for this task.
      </FormDescription>
      
      <div className="flex items-center justify-between">
        <FormLabel className="text-white">Image Upload</FormLabel>
        <Input
          id="image-upload"
          type="file"
          className="hidden"
          onChange={onImageUpload}
          {...register("background_image_url")}
        />
        <label
          htmlFor="image-upload"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-nav-active text-white hover:bg-nav-active/80 px-4 py-2"
        >
          <Upload className="w-4 h-4 mr-2" aria-hidden={true} />
          Upload Image
        </label>
      </div>
      
      <div className="space-y-2">
        <FormLabel className="text-white">Focal Point</FormLabel>
        <FormDescription className="text-white">
          Adjust the focal point of the background image.
        </FormDescription>
        <FormControl>
          <Slider
            defaultValue={[position.x, position.y]}
            onValueChange={handlePositionChange}
            max={100}
            step={1}
            aria-label="Focal Point"
            className="bg-dark-navy"
          />
        </FormControl>
      </div>
    </div>
  );
};

export default BackgroundImageSelector;
