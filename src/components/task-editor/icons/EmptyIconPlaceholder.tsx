
import React from 'react';
import { Button } from "@/components/ui/button";
import { Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface EmptyIconPlaceholderProps {
  onUploadIcon: () => void;
  onRemoveIcon: () => void;
  onSelectIcon: (iconName: string) => void;
}

export const EmptyIconPlaceholder: React.FC<EmptyIconPlaceholderProps> = ({
  onUploadIcon,
  onRemoveIcon,
  onSelectIcon
}) => {
  return (
    <div className="flex flex-col items-center space-y-4 h-full">
      <div className="w-20 h-20 bg-[#1A1F2C] rounded-md flex items-center justify-center">
        {/* Empty square placeholder for icon */}
      </div>
      <div className="flex flex-col w-full space-y-2">
        <Button 
          type="button"
          onClick={onUploadIcon}
          className="w-full bg-[#222F45] hover:bg-[#2A3754] text-white flex items-center justify-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload Icon
        </Button>
        <Button 
          type="button"
          onClick={onRemoveIcon}
          className="w-full bg-[#1A1F2C] hover:bg-[#222F45] text-white"
        >
          Remove Icon
        </Button>
      </div>
      
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
              onSelectIcon('');
              toast({
                title: "Icon uploaded",
                description: "Custom icon has been uploaded",
              });
            };
            reader.readAsDataURL(file);
          }
        }}
        id="icon-file-input"
      />
    </div>
  );
};
