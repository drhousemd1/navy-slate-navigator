
//INSTRUCTIONS FOR LOVABLE: NEVER EVER CHANGE UI ELEMENTS OR UI DESIGN FOR ANY REASON
import React from 'react';
import { Button } from "@/components/ui/button";
import { Upload } from 'lucide-react';

interface IconDisplayProps {
  iconPreview?: string | null;
  children?: React.ReactNode;
  onUploadIcon: () => void;
  onRemoveIcon: () => void;
}

export const IconDisplay: React.FC<IconDisplayProps> = ({
  iconPreview,
  children,
  onUploadIcon,
  onRemoveIcon
}) => {
  return (
    <div className="space-y-4">
      <div className={`w-16 h-16 mx-auto bg-dark-navy rounded-lg ${iconPreview ? 'overflow-hidden' : 'flex items-center justify-center'}`}>
        {iconPreview ? (
          <img 
            src={iconPreview} 
            alt="Icon preview" 
            className="w-full h-full object-contain"
          />
        ) : children}
      </div>
      <div className="flex flex-col space-y-2">
        <Button 
          type="button"
          variant="secondary" 
          onClick={onUploadIcon}
          className="bg-light-navy text-white hover:bg-navy flex items-center justify-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload Icon
        </Button>
        <Button 
          type="button"
          variant="secondary" 
          onClick={onRemoveIcon}
          className="bg-dark-navy text-white hover:bg-light-navy"
        >
          Remove Icon
        </Button>
      </div>
    </div>
  );
};
