
import React from 'react';
import { FormLabel } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Upload } from 'lucide-react';

interface ImageUploadSectionProps {
  imagePreview: string | null;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  children?: React.ReactNode;
}

const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({ 
  imagePreview, 
  onImageUpload, 
  onRemoveImage,
  children 
}) => {
  return (
    <div className="space-y-4">
      <FormLabel className="text-white">Background Image</FormLabel>
      
      <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
        {imagePreview ? (
          <div className="space-y-4">
            {children}
            <Button 
              type="button"
              variant="secondary" 
              onClick={onRemoveImage}
              className="bg-dark-navy text-white hover:bg-light-navy"
            >
              Remove Image
            </Button>
          </div>
        ) : (
          <div className="relative h-32 flex flex-col items-center justify-center">
            <Upload className="h-10 w-10 text-white mb-2" />
            <p className="text-white">Click to upload or drag and drop</p>
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={onImageUpload}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploadSection;
