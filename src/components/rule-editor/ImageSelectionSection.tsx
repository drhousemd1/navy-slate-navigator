
import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ImageSelectionSectionProps {
  images: (string | null)[];
  selectedImageIndex: number;
  setSelectedImageIndex: (index: number) => void;
  setImagePreview: (preview: string | null) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveImage: () => void;
  focalPointX: number;
  focalPointY: number;
  onFocalPointChange?: (x: number, y: number) => void;
  carouselTimer: number;
  setCarouselTimer: (value: number) => void;
}

const ImageSelectionSection: React.FC<ImageSelectionSectionProps> = ({
  images,
  selectedImageIndex,
  setSelectedImageIndex,
  setImagePreview,
  handleImageUpload,
  handleRemoveImage,
  focalPointX,
  focalPointY,
  onFocalPointChange,
  carouselTimer,
  setCarouselTimer,
}) => {
  const handleSelectThumbnail = (index: number) => {
    setSelectedImageIndex(index);
    setImagePreview(images[index] || null); // Reset preview if empty
  };

  const currentImage = selectedImageIndex !== null ? images[selectedImageIndex] : null;

  return (
    <div className="space-y-4">
      <Label className="text-white text-lg">Background Image</Label>
      <div className="flex justify-between items-end mb-4">
        <div className="flex gap-2">
          {images.map((img, index) => (
            <div
              key={index}
              onClick={() => handleSelectThumbnail(index)}
              className={`w-16 h-16 border-2 rounded-md cursor-pointer overflow-hidden flex items-center justify-center ${
                selectedImageIndex === index ? "border-cyan-300" : "border-gray-700"
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
              onClick={() => setCarouselTimer(Math.max(1, carouselTimer - 1))}
              className="px-3 py-1 bg-dark-navy text-white hover:bg-light-navy border border-light-navy"
            >
              –
            </Button>
            <div className="w-10 text-center text-white">{carouselTimer}</div>
            <Button
              type="button"
              size="sm"
              onClick={() => setCarouselTimer(carouselTimer + 1)}
              className="px-3 py-1 bg-dark-navy text-white hover:bg-light-navy border border-light-navy"
            >
              +
            </Button>
            <span className="text-sm text-slate-400">(s)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageSelectionSection;
