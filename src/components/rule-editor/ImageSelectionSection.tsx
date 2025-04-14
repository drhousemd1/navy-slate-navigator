
import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash, Image } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
  // Ensure we have exactly 5 slots at initialization time
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
  
  // Find first non-empty image index, or default to 0
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(
    backgroundImages.findIndex(img => img) >= 0 
      ? backgroundImages.findIndex(img => img) 
      : 0
  );
  
  // Initialize images array with exactly 5 slots
  const images = [...backgroundImages];
  while (images.length < 5) {
    images.push('');
  }
  // Ensure we never have more than 5 slots
  const normalizedImages = images.slice(0, 5);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const newImages = [...normalizedImages];
      newImages[selectedImageIndex] = base64String;
      
      // Always pass all 5 slots, including empty ones
      onImagesChange(newImages);
    };
    
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    const newImages = [...normalizedImages];
    newImages[selectedImageIndex] = '';
    
    // Always pass all 5 slots, including empty ones
    onImagesChange(newImages);
    
    // Select next available image if any
    const nextAvailableIndex = newImages.findIndex(img => img);
    if (nextAvailableIndex >= 0) {
      setSelectedImageIndex(nextAvailableIndex);
    } else {
      setSelectedImageIndex(0);
    }
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
      <div className="flex justify-between items-start">
        <Label className="text-white text-lg">Background Images</Label>
        
        <div className="flex flex-col items-start">
          <div className="text-left">
            <h3 className="font-medium text-white">Carousel Timer</h3>
            <p className="text-sm text-gray-300">(Time between image transitions)</p>
          </div>
          <div className="flex items-center mt-2">
            <button
              type="button"
              onClick={() => onCarouselTimerChange(Math.max(1, carouselTimer - 1))}
              className="bg-gray-700 hover:bg-gray-600 text-white rounded-l px-3 py-1"
            >
              –
            </button>
            <span className="bg-gray-800 text-white px-4 py-1">
              {carouselTimer}
            </span>
            <button
              type="button"
              onClick={() => onCarouselTimerChange(carouselTimer + 1)}
              className="bg-gray-700 hover:bg-gray-600 text-white rounded-r px-3 py-1"
            >
              +
            </button>
            <span className="text-white ml-2">(s)</span>
          </div>
        </div>
      </div>
      
      {/* Thumbnails - always show exactly 5 */}
      <div className="flex gap-2">
        {normalizedImages.map((image, index) => (
          <div
            key={index}
            onClick={() => setSelectedImageIndex(index)}
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
            ) : null}
          </div>
        ))}
      </div>

      {/* Image Preview with Focal Point */}
      <div className="bg-gray-800 rounded-md p-4">
        <div className="flex justify-between items-center mb-2">
          <Label className="text-white">Image Preview</Label>
          <div className="flex gap-2">
            <input 
              type="file" 
              id="image-upload" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageUpload}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => document.getElementById('image-upload')?.click()}
              className="bg-dark-navy text-white hover:bg-gray-700"
            >
              <Plus className="mr-1 w-4 h-4" /> Upload
            </Button>
            
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleRemoveImage}
              disabled={!normalizedImages[selectedImageIndex]}
              className="bg-dark-navy text-white hover:bg-gray-700"
            >
              <Trash className="mr-1 w-4 h-4" /> Remove
            </Button>
          </div>
        </div>
        
        <div 
          className="w-full h-48 border border-gray-600 rounded-md relative overflow-hidden"
          onClick={handleFocalPointChange}
        >
          {normalizedImages[selectedImageIndex] ? (
            <>
              <img 
                src={normalizedImages[selectedImageIndex]} 
                alt="Selected background" 
                className="w-full h-full object-cover" 
                style={{
                  objectPosition: `${focalPointX * 100}% ${focalPointY * 100}%`
                }}
              />
              
              {onFocalPointChange && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="absolute bg-black bg-opacity-50 text-white px-4 py-2 rounded-full">
                    Click and drag to adjust focal point
                  </div>
                  
                  <div 
                    className="absolute w-8 h-8 rounded-full bg-white border-4 border-blue-500"
                    style={{
                      left: `calc(${focalPointX * 100}% - 16px)`,
                      top: `calc(${focalPointY * 100}% - 16px)`
                    }}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-gray-400 flex flex-col items-center justify-center h-full">
              <Image className="w-12 h-12 mb-2" />
              <span>No image selected</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageSelectionSection;
