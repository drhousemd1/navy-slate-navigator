
import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash, Image } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface ImageSelectionSectionProps {
  backgroundImages: string[];
  onImagesChange: (images: string[]) => void;
  carouselTimer: number;
  onCarouselTimerChange: (seconds: number) => void;
}

const ImageSelectionSection: React.FC<ImageSelectionSectionProps> = ({
  backgroundImages = [],
  onImagesChange,
  carouselTimer,
  onCarouselTimerChange
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    backgroundImages.length > 0 ? 0 : null
  );
  const [imagePreview, setImagePreview] = useState<string | null>(
    backgroundImages.length > 0 ? backgroundImages[0] : null
  );

  // Initialize images array with 5 slots if not provided
  const images = [...backgroundImages];
  while (images.length < 5) {
    images.push('');
  }

  const handleImageSelect = (index: number) => {
    setSelectedImageIndex(index);
    setImagePreview(images[index] || null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (selectedImageIndex === null) {
      toast({
        title: "Error",
        description: "Please select an image slot first",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const newImages = [...images];
      newImages[selectedImageIndex] = base64String;
      
      onImagesChange(newImages.filter(Boolean));
      setImagePreview(base64String);
    };
    
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    if (selectedImageIndex === null) return;
    
    const newImages = [...images];
    newImages[selectedImageIndex] = '';
    
    onImagesChange(newImages.filter(Boolean));
    setImagePreview(null);
    
    // Select next available image if any
    const nextAvailableIndex = newImages.findIndex(img => img);
    if (nextAvailableIndex >= 0) {
      setSelectedImageIndex(nextAvailableIndex);
      setImagePreview(newImages[nextAvailableIndex]);
    } else {
      setSelectedImageIndex(0);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <Label className="text-white text-lg">Background Images</Label>
        <div className="flex justify-between items-end mb-4">
          <div className="flex gap-2">
            {images.map((image, index) => (
              <div
                key={index}
                onClick={() => handleImageSelect(index)}
                className={`
                  w-16 h-16 border-2 rounded-md overflow-hidden cursor-pointer
                  ${selectedImageIndex === index 
                    ? 'border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' 
                    : 'border-gray-600'}
                  ${image ? 'bg-transparent' : 'bg-gray-800'}
                `}
              >
                {image ? (
                  <img 
                    src={image} 
                    alt={`Background ${index + 1}`} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400 flex items-center justify-center">
                    <Image className="w-6 h-6" />
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex flex-col items-end">
            <div className="text-right">
              <Label htmlFor="carousel-timer" className="text-white font-medium">
                Carousel Timer
              </Label>
              <p className="text-xs text-gray-300">(Time between transitions)</p>
            </div>
            <div className="flex items-center mt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onCarouselTimerChange(Math.max(1, carouselTimer - 1))}
                className="bg-gray-700 hover:bg-gray-600 text-white rounded-l px-3 py-1 h-8"
              >
                –
              </Button>
              <span className="bg-gray-800 text-white px-4 py-1 h-8 flex items-center">
                {carouselTimer}
              </span>
              <Button
                type="button"
                size="sm" 
                variant="outline"
                onClick={() => onCarouselTimerChange(carouselTimer + 1)}
                className="bg-gray-700 hover:bg-gray-600 text-white rounded-r px-3 py-1 h-8"
              >
                +
              </Button>
              <span className="text-sm text-white ml-2">(s)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 border border-gray-700 rounded-md p-4 bg-gray-900">
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
              className="bg-gray-700 text-white hover:bg-gray-600 flex items-center"
            >
              <Plus className="mr-1 w-4 h-4" /> Upload
            </Button>
            
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleRemoveImage}
              disabled={!imagePreview}
              className="bg-gray-700 text-white hover:bg-gray-600 flex items-center"
            >
              <Trash className="mr-1 w-4 h-4" /> Remove
            </Button>
          </div>
        </div>
        
        <div className="mt-4 relative">
          <div 
            className="w-full h-64 bg-gray-800 rounded-md relative overflow-hidden"
          >
            {imagePreview ? (
              <img 
                src={imagePreview} 
                alt="Selected background" 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="text-gray-400 flex flex-col items-center justify-center h-full">
                <Image className="w-12 h-12 mb-2" />
                <span>No image selected</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageSelectionSection;
