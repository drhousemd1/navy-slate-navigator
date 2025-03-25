
import React from 'react';
import { CheckSquare, BookOpen, Coffee, Dumbbell, Star, Heart, Trophy, Target, Upload } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from '@/hooks/use-toast';

export const predefinedIcons = [
  { name: 'CheckSquare', icon: CheckSquare },
  { name: 'BookOpen', icon: BookOpen },
  { name: 'Coffee', icon: Coffee },
  { name: 'Dumbbell', icon: Dumbbell },
  { name: 'Star', icon: Star },
  { name: 'Heart', icon: Heart },
  { name: 'Trophy', icon: Trophy },
  { name: 'Target', icon: Target },
];

interface IconSelectorProps {
  selectedIconName: string | null;
  iconPreview: string | null;
  iconColor: string;
  onSelectIcon: (iconName: string) => void;
  onUploadIcon: () => void;
  onRemoveIcon: () => void;
}

const IconSelector: React.FC<IconSelectorProps> = ({ 
  selectedIconName, 
  iconPreview, 
  iconColor,
  onSelectIcon, 
  onUploadIcon, 
  onRemoveIcon 
}) => {
  const renderIcon = (iconName: string) => {
    const IconComponent = predefinedIcons.find(i => i.name === iconName)?.icon;
    if (!IconComponent) return null;
    return <IconComponent className="h-6 w-6" style={{ color: iconColor }} />;
  };

  if (iconPreview) {
    return (
      <div className="space-y-4">
        <div className="w-16 h-16 mx-auto bg-dark-navy rounded-lg overflow-hidden">
          <img 
            src={iconPreview} 
            alt="Icon preview" 
            className="w-full h-full object-contain"
          />
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
  } 
  
  if (selectedIconName) {
    return (
      <div className="space-y-4">
        <div className="w-16 h-16 mx-auto bg-dark-navy rounded-lg flex items-center justify-center">
          {renderIcon(selectedIconName)}
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
  }

  return (
    <div className="relative h-32">
      <Upload className="mx-auto h-8 w-8 text-light-navy mb-2" />
      <p className="text-light-navy">Upload custom icon</p>
      <input
        type="file"
        accept="image/*"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
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
      />
    </div>
  );
};

export default IconSelector;
