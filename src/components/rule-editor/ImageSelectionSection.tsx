
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <div className="flex gap-2">
          {images.map((img, index) => (
            <div
              key={index}
              className={`w-16 h-16 border-2 rounded cursor-pointer overflow-hidden flex items-center justify-center ${
                selectedImageIndex === index ? "border-cyan-300" : "border-gray-700"
              }`}
              onClick={() => handleSelectThumbnail(index)}
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

        {/* Carousel Timer UI */}
        <div className="flex items-center gap-2">
          <Label className="text-sm text-white">Carousel Timer</Label>
          <Button
            type="button"
            size="sm"
            onClick={() => setCarouselTimer(carouselTimer - 1)}
            className="bg-dark-navy text-white hover:bg-light-navy px-2 py-1 rounded"
          >
            -
          </Button>
          <span className="text-white text-sm">{carouselTimer}s</span>
          <Button
            type="button"
            size="sm"
            onClick={() => setCarouselTimer(carouselTimer + 1)}
            className="bg-dark-navy text-white hover:bg-light-navy px-2 py-1 rounded"
          >
            +
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImageSelectionSection;
