
import React, { useState, useEffect } from 'react';
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
  
  // Initialize the images array properly to avoid undefined errors
  const initialImages = backgroundImages && backgroundImages.length > 0 
    ? [...backgroundImages] 
    : Array(5).fill('');

  // Use the modal image handling hook to manage image state
  const { images, selectedImageIndex, selectImage, updateImage } = useModalImageHandling(
    initialImages.length === 5 ? initialImages : initialImages.concat(Array(5 - initialImages.length).fill(''))
  );
  
  useEffect(() => {
    // Only update parent component when images actually change
    if (JSON.stringify(images) !== JSON.stringify(backgroundImages)) {
      onImagesChange(images);
    }
  }, [images]);

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
      
      {/* Image upload/preview section */}
      <div className="mt-4 p-4 border-2 border-dashed border-gray-600 rounded-lg bg-gray-800/50">
        <div className="flex justify-between items-center mb-3">
          <span className="text-white font-medium">
            {selectedImageIndex !== -1 ? `Image ${selectedImageIndex + 1}` : 'Select an image slot above'}
          </span>
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-dark-navy hover:bg-navy border-gray-600 text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                Upload
              </Button>
            </label>
            {images[selectedImageIndex] && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemoveImage}
                className="bg-red-900/50 hover:bg-red-900 border-none"
              >
                <Trash className="w-4 h-4 mr-1" />
                Remove
              </Button>
            )}
          </div>
        </div>
        
        {/* Image preview */}
        {selectedImageIndex !== -1 && (
          <div 
            className="relative w-full h-40 bg-gray-900 rounded-md overflow-hidden"
            onClick={handleFocalPointChange}
          >
            {images[selectedImageIndex] ? (
              <>
                <img 
                  src={images[selectedImageIndex]} 
                  alt="Selected background" 
                  className="w-full h-full object-cover"
                />
                {onFocalPointChange && (
                  <div 
                    className="absolute w-6 h-6 rounded-full border-2 border-white bg-blue-500/50 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ 
                      left: `${focalPointX * 100}%`, 
                      top: `${focalPointY * 100}%` 
                    }}
                  />
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Image className="w-12 h-12 mb-2" />
                <p>No image selected</p>
                <p className="text-sm">(Click 'Upload' to add an image)</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageSelectionSection;
