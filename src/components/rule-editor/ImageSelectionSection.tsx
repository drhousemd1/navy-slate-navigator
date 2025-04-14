
import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ImageSelectionSectionProps {
  backgroundImages: (string | null)[];
  onImagesChange: (images: (string | null)[]) => void;
  carouselTimer: number;
  onCarouselTimerChange: (timer: number) => void;
  focalPointX: number;
  focalPointY: number;
  onFocalPointChange?: (x: number, y: number) => void;
}

const ImageSelectionSection: React.FC<ImageSelectionSectionProps> = ({
  backgroundImages,
  onImagesChange,
  carouselTimer,
  onCarouselTimerChange,
  focalPointX,
  focalPointY,
  onFocalPointChange,
}) => {
  const [selectedBoxIndex, setSelectedBoxIndex] = React.useState<number | null>(0);

  const handleSelect = (index: number) => {
    setSelectedBoxIndex(index);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || selectedBoxIndex === null) return;
    const file = e.target.files[0];
    const url = URL.createObjectURL(file);
    const updated = [...backgroundImages];
    updated[selectedBoxIndex] = url;
    onImagesChange(updated);
  };

  const handleRemove = () => {
    if (selectedBoxIndex === null) return;
    const updated = [...backgroundImages];
    updated[selectedBoxIndex] = null;
    onImagesChange(updated);
  };

  const currentImage = selectedBoxIndex !== null ? backgroundImages[selectedBoxIndex] : null;

  return (
    <div className="space-y-4">
      <Label className="text-white text-lg">Background Image</Label>
      <div className="flex justify-between items-end mb-4">
        <div className="flex gap-2">
          {backgroundImages.map((img, index) => (
            <div
              key={index}
              onClick={() => handleSelect(index)}
              className={`w-16 h-16 border-2 rounded-md cursor-pointer overflow-hidden flex items-center justify-center ${
                selectedBoxIndex === index ? "border-cyan-300" : "border-gray-700"
              }`}
            >
              {img ? (
                <img
                  src={img}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-start space-y-1">
          <span className="text-sm text-white font-medium leading-tight">Carousel Timer</span>
          <span className="text-xs text-slate-400">(Settings will be applied to all cards)</span>
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              size="sm"
              onClick={() => onCarouselTimerChange(Math.max(1, carouselTimer - 1))}
              className="px-3 py-1 bg-dark-navy text-white hover:bg-light-navy border border-light-navy"
            >
              –
            </Button>
            <div className="w-10 text-center text-white">{carouselTimer}</div>
            <Button
              type="button"
              size="sm"
              onClick={() => onCarouselTimerChange(carouselTimer + 1)}
              className="px-3 py-1 bg-dark-navy text-white hover:bg-light-navy border border-light-navy"
            >
              +
            </Button>
            <span className="text-sm text-slate-400">(s)</span>
          </div>
        </div>
      </div>

      <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
        {currentImage ? (
          <div className="space-y-4">
            <div className="relative w-full h-48 rounded-lg overflow-hidden">
              <img
                src={currentImage}
                alt="Preview"
                className="object-cover w-full h-full"
                style={{
                  objectPosition: `${focalPointX * 100}% ${focalPointY * 100}%`,
                }}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleRemove}
              className="bg-dark-navy text-white hover:bg-light-navy"
            >
              Remove Image
            </Button>
          </div>
        ) : (
          <div className="relative h-32 flex flex-col items-center justify-center">
            <p className="text-light-navy">Click to upload or drag and drop</p>
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleImageUpload}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageSelectionSection;
