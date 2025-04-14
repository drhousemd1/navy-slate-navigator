
import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Image } from 'lucide-react';

interface RuleImageSelectionSectionProps {
  backgroundImages: string[];
  onImagesChange: (images: string[]) => void;
  carouselTimer: number;
  onCarouselTimerChange: (seconds: number) => void;
  focalPointX?: number;
  focalPointY?: number;
  onFocalPointChange?: (x: number, y: number) => void;
  setGlobalCarouselIndex: (index: number) => void;
}

const RuleImageSelectionSection: React.FC<RuleImageSelectionSectionProps> = ({
  backgroundImages = [],
  onImagesChange,
  carouselTimer,
  onCarouselTimerChange,
  focalPointX = 0.5,
  focalPointY = 0.5,
  onFocalPointChange,
  setGlobalCarouselIndex
}) => {
  // Ensure we have exactly 5 slots for initialization
  useEffect(() => {
    // If the passed backgroundImages array doesn't have exactly 5 elements
    if (backgroundImages.length !== 5) {
      const normalizedImages = [...backgroundImages];
      while (normalizedImages.length < 5) {
        normalizedImages.push('');
      }
      // Handle case where there are more than 5 images
      if (normalizedImages.length > 5) {
        normalizedImages.length = 5;
      }
      onImagesChange(normalizedImages);
    }
  }, []);
  
  // Local state for image management
  const [images, setImages] = useState(backgroundImages);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  // Update local state when props change
  useEffect(() => {
    if (JSON.stringify(images) !== JSON.stringify(backgroundImages)) {
      setImages(backgroundImages);
    }
  }, [backgroundImages]);
  
  // Update parent component when local state changes
  useEffect(() => {
    if (JSON.stringify(images) !== JSON.stringify(backgroundImages)) {
      onImagesChange(images);
    }
  }, [images]);
  
  const selectImage = (index: number) => {
    setSelectedImageIndex(index);
    setGlobalCarouselIndex(index);
  };
  
  const updateImage = (imageUrl: string) => {
    const updatedImages = [...images];
    updatedImages[selectedImageIndex] = imageUrl;
    setImages(updatedImages);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      updateImage(base64String);
    };
    
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <div>
          <Label className="text-white text-lg">Background Images</Label>
          <div className="flex gap-2 mt-2">
            {images.map((image, index) => (
              <div
                key={index}
                onClick={() => {
                  selectImage(index);
                }}
                className={`
                  w-16 h-16 border-2 rounded-md overflow-hidden cursor-pointer
                  ${selectedImageIndex === index 
                    ? 'border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' 
                    : 'border-gray-600'}
                  bg-gray-800
                `}
              >
                {image ? (
                  <img 
                    src={image} 
                    alt={`Background ${index + 1}`} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Image className="w-8 h-8 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex flex-col">
          <div>
            <h3 className="font-medium text-white">Carousel Timer</h3>
            <p className="text-sm text-gray-300">(Time between image transitions)</p>
          </div>
          <div className="flex items-center mt-2">
            <button
              type="button"
              onClick={() => onCarouselTimerChange(Math.max(1, carouselTimer - 1))}
              className="bg-gray-800 hover:bg-gray-700 text-white rounded-l px-3 py-1"
            >
              –
            </button>
            <span className="bg-gray-900 text-white px-4 py-1">
              {carouselTimer}
            </span>
            <button
              type="button"
              onClick={() => onCarouselTimerChange(carouselTimer + 1)}
              className="bg-gray-800 hover:bg-gray-700 text-white rounded-r px-3 py-1"
            >
              +
            </button>
            <span className="text-white ml-2">(s)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuleImageSelectionSection;
