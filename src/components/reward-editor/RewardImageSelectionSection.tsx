
import React, { useState } from 'react';
import { useRewardForm } from './RewardFormProvider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Image, Upload, X } from 'lucide-react';

const RewardImageSelectionSection: React.FC = () => {
  const { reward } = useRewardForm();
  const [imagePreview, setImagePreview] = useState<string | null>(reward.background_image_url || null);
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImagePreview(result);
        // Set image in form data
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemoveImage = () => {
    setImagePreview(null);
    // Remove image from form data
  };
  
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="background-image" className="text-white">Reward Background Image</Label>
        <div className="mt-2 flex items-center gap-2">
          <Input 
            id="background-image" 
            type="file" 
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <Button 
            type="button" 
            variant="outline"
            onClick={() => document.getElementById('background-image')?.click()}
            className="flex items-center gap-2"
          >
            <Upload size={16} />
            {imagePreview ? 'Change Image' : 'Upload Image'}
          </Button>
          
          {imagePreview && (
            <Button
              type="button"
              variant="outline"
              onClick={handleRemoveImage}
              className="text-red-500"
            >
              <X size={16} className="mr-2" />
              Remove
            </Button>
          )}
        </div>
      </div>
      
      {imagePreview && (
        <div className="mt-4">
          <Label className="text-white mb-2 block">Preview</Label>
          <div className="relative w-full h-40 overflow-hidden rounded-md border border-gray-700">
            <img 
              src={imagePreview} 
              alt="Background preview" 
              className="object-cover w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RewardImageSelectionSection;
