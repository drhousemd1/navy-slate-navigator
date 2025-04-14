
import React from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash, Image } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useModalImageHandling } from '../rule/hooks/useModalImageHandling';

interface ImageSelectionSectionProps {
  backgroundImages: string[];
  onImagesChange: (images: string[]) => void;
  carouselTimer: number;
  onCarouselTimerChange: (seconds: number) => void;
  focalPointX?: number;
  focalPointY?: number;
  onFocalPointChange?: (x: number, y: number) => void;
}

const ImageSelectionSection: React.FC<ImageSelectionSectionProps> = ({
  backgroundImages = [],
  onImagesChange,
  carouselTimer,
  onCarouselTimerChange,
  focalPointX = 0.5,
  focalPointY = 0.5,
  onFocalPointChange
}) => {
  // Ensure we have exactly 5 slots for initialization
  React.useEffect(() => {
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
  
  // Use the modal image handling hook to manage image state
  const { images, selectedImageIndex, selectImage, updateImage } = useModalImageHandling(
    backgroundImages.length === 5 ? backgroundImages : [...backgroundImages].concat(Array(5 - backgroundImages.length).fill(''))
  );
  
  React.useEffect(() => {
    // Only update parent component when images actually change
    if (JSON.stringify(images) !== JSON.stringify(backgroundImages)) {
      onImagesChange(images);
    }
  }, [images, backgroundImages, onImagesChange]);

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

  const handleRemoveImage = () => {
    updateImage('');
  };

  const handleFocalPointChange = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onFocalPointChange) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    onFocalPointChange(x, y);
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
                onClick={() => selectImage(index)}
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
      
      {/* Single image preview section that changes based on selected thumbnail */}
      <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
        {images[selectedImageIndex] ? (
          <div className="space-y-4">
            <div 
              className="relative w-full h-48 rounded-lg overflow-hidden"
              onClick={handleFocalPointChange}
            >
              <img
                src={images[selectedImageIndex]}
                alt="Preview"
                className="object-cover w-full h-full"
                style={{
                  objectPosition: `${focalPointX * 100}% ${focalPointY * 100}%`,
                }}
              />
              {onFocalPointChange && (
                <div 
                  className="absolute rounded-full w-4 h-4 bg-white border-2 border-blue-500 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{
                    left: `${focalPointX * 100}%`,
                    top: `${focalPointY * 100}%`
                  }}
                />
              )}
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleRemoveImage}
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
