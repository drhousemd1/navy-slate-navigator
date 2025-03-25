
import React from 'react';
import { 
  CheckSquare, BookOpen, Coffee, Dumbbell, Star, Heart, Trophy, Target, Upload,
  Calendar, BarChart, BellRing, Book, Bookmark, Box, Briefcase, Building, Cake,
  Camera, Car, Compass, CreditCard, Crown, Droplet, Edit, Film, Flag, Flame,
  Flower, Gift, Globe, Headphones, Home, Image, Key, Laptop, Leaf, Lightbulb,
  Link, Lock, Mail, Map, MapPin, Music, Package, Phone, Plane, Plant, Printer,
  ShoppingBag, ShoppingCart, Smartphone, Smile, Snowflake, Sun, Sunset, Tag,
  Truck, Umbrella, Video, Watch, Zap
} from 'lucide-react';
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
  { name: 'Calendar', icon: Calendar },
  { name: 'BarChart', icon: BarChart },
  { name: 'BellRing', icon: BellRing },
  { name: 'Book', icon: Book },
  { name: 'Bookmark', icon: Bookmark },
  { name: 'Box', icon: Box },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Building', icon: Building },
  { name: 'Cake', icon: Cake },
  { name: 'Camera', icon: Camera },
  { name: 'Car', icon: Car },
  { name: 'Compass', icon: Compass },
  { name: 'CreditCard', icon: CreditCard },
  { name: 'Crown', icon: Crown },
  { name: 'Droplet', icon: Droplet },
  { name: 'Edit', icon: Edit },
  { name: 'Film', icon: Film },
  { name: 'Flag', icon: Flag },
  { name: 'Flame', icon: Flame },
  { name: 'Flower', icon: Flower },
  { name: 'Gift', icon: Gift },
  { name: 'Globe', icon: Globe },
  { name: 'Headphones', icon: Headphones },
  { name: 'Home', icon: Home },
  { name: 'Image', icon: Image },
  { name: 'Key', icon: Key },
  { name: 'Laptop', icon: Laptop },
  { name: 'Leaf', icon: Leaf },
  { name: 'Lightbulb', icon: Lightbulb },
  { name: 'Link', icon: Link },
  { name: 'Lock', icon: Lock },
  { name: 'Mail', icon: Mail },
  { name: 'Map', icon: Map },
  { name: 'MapPin', icon: MapPin },
  { name: 'Music', icon: Music },
  { name: 'Package', icon: Package },
  { name: 'Phone', icon: Phone },
  { name: 'Plane', icon: Plane },
  { name: 'Plant', icon: Plant },
  { name: 'Printer', icon: Printer },
  { name: 'ShoppingBag', icon: ShoppingBag },
  { name: 'ShoppingCart', icon: ShoppingCart },
  { name: 'Smartphone', icon: Smartphone },
  { name: 'Smile', icon: Smile },
  { name: 'Snowflake', icon: Snowflake },
  { name: 'Sun', icon: Sun },
  { name: 'Sunset', icon: Sunset },
  { name: 'Tag', icon: Tag },
  { name: 'Truck', icon: Truck },
  { name: 'Umbrella', icon: Umbrella },
  { name: 'Video', icon: Video },
  { name: 'Watch', icon: Watch },
  { name: 'Zap', icon: Zap },
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
