
import React from "react";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form";
import { Upload } from "lucide-react";

interface ImageSelectionSectionProps {
  imagePreview: string | null;
  imageSlots: (string | null)[];
  selectedBoxIndex: number | null;
  carouselTimer: number;
  onCarouselTimerChange: (timer: number) => void;
  onSelectImageSlot: (index: number) => void;
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ImageSelectionSection: React.FC<ImageSelectionSectionProps> = ({
  imagePreview,
  imageSlots,
  selectedBoxIndex,
  carouselTimer,
  onCarouselTimerChange,
  onSelectImageSlot,
  onRemoveImage,
  onImageUpload,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const triggerUpload = () => inputRef.current?.click();

  return (
    <div className="space-y-2">
      <FormLabel>Background Images</FormLabel>
      <div className="relative w-full h-40 border rounded overflow-hidden bg-gray-100 flex items-center justify-center">
        {imagePreview ? (
          <img src={imagePreview} alt="Preview" className="object-cover w-full h-full" />
        ) : (
          <span className="text-sm text-muted-foreground">No image selected</span>
        )}
      </div>
      <div className="flex justify-between mt-2">
        <Button onClick={triggerUpload} type="button" variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
        <Button onClick={onRemoveImage} type="button" variant="ghost" size="sm">
          Remove
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onImageUpload}
          hidden
        />
      </div>
      <div className="flex flex-col space-y-1">
        <label htmlFor="carouselTimer" className="text-sm text-muted-foreground">
          Carousel Timer (seconds)
        </label>
        <input
          id="carouselTimer"
          type="number"
          min={0}
          value={carouselTimer}
          onChange={(e) => onCarouselTimerChange(parseInt(e.target.value))}
          className="border rounded p-1 text-sm"
        />
      </div>
    </div>
  );
};

export default ImageSelectionSection;
