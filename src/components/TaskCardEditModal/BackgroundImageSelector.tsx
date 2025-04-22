import React, { useState, useCallback } from 'react';
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { PanZoom } from 'react-easy-panzoom';
import { Trash2 } from 'lucide-react';
import { Control, useController } from 'react-hook-form';

// Define the TaskFormValues interface ( duplicated from TaskEditForm.tsx to avoid circular dependencies )
interface TaskFormValues {
  title: string;
  description: string;
  points: number;
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  background_image_url?: string;
  background_opacity: number;
  icon_url?: string;
  icon_name?: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  priority: 'low' | 'medium' | 'high';
}

interface BackgroundImageSelectorProps {
  control: Control<TaskFormValues>;
  imagePreview: string | null;
  initialPosition: { x: number; y: number };
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: any; // React Hook Form setValue function
}

const BackgroundImageSelector: React.FC<BackgroundImageSelectorProps> = ({
  control,
  imagePreview,
  initialPosition,
  onRemoveImage,
  onImageUpload,
  setValue,
}) => {
  const panZoomRef = React.useRef<PanZoom>(null);
  const [position, setPosition] = useState(initialPosition);

  const { field } = useController({
    name: 'background_opacity',
    control,
    defaultValue: 100,
  });

  const handleImagePositionChange = useCallback(() => {
    if (panZoomRef.current) {
      const { x, y } = panZoomRef.current.getPosition();
      setPosition({ x, y });
      setValue('focal_point_x', x);
      setValue('focal_point_y', y);
    }
  }, [setValue]);

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="background_opacity"
        render={() => (
          <FormItem>
            <FormLabel className="text-white">Background Opacity</FormLabel>
            <FormControl>
              <Slider
                defaultValue={[field.value]}
                max={100}
                step={1}
                onValueChange={(value) => field.onChange(value[0])}
                className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
              />
            </FormControl>
          </FormItem>
        )}
      />
      
      <div className="flex items-center justify-between">
        <FormLabel className="text-white text-lg">Image Preview</FormLabel>
        {imagePreview && (
          <Button variant="destructive" size="sm" onClick={onRemoveImage}>
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>
      
      <div className="border-2 border-dashed border-light-navy rounded-lg">
        <AspectRatio ratio={16 / 9}>
          {imagePreview ? (
            <PanZoom
              ref={panZoomRef}
              className="bg-gray-100 overflow-hidden rounded-lg relative"
              maxZoom={4}
              onZoom={handleImagePositionChange}
              onPan={handleImagePositionChange}
              boundaryRatioVertical={0.5}
              boundaryRatioHorizontal={0.5}
              detectPinchGestures={false}
            >
              <img
                src={imagePreview}
                alt="Background Preview"
                className="transition-opacity duration-500 absolute inset-0 object-cover w-full h-full"
                style={{ opacity: field.value / 100, transform: `translate(${position.x}%, ${position.y}%)` }}
                onLoad={() => {
                  if (panZoomRef.current) {
                    panZoomRef.current.autoCenter(1);
                  }
                }}
              />
            </PanZoom>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-4">
              <FormDescription className="text-white">Upload an image to set as the background.</FormDescription>
              <Button variant="outline" asChild>
                <label htmlFor="image-upload-input" className="cursor-pointer">
                  Upload Image
                </label>
              </Button>
              <input
                type="file"
                id="image-upload-input"
                accept="image/*"
                className="hidden"
                onChange={onImageUpload}
              />
            </div>
          )}
        </AspectRatio>
      </div>
    </div>
  );
};

export default BackgroundImageSelector;