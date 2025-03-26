
import React from 'react';
import { Button } from "@/components/ui/button";
import { toast } from '@/hooks/use-toast';
import { 
  Upload, CheckSquare, BookOpen, Coffee, Dumbbell, Star, Heart, Trophy, Target, 
  Activity, AlarmClock, Bell, Calendar, Camera, Music, Cloud, Home, User, File, Gift,
  Zap, Store, Book, Sun, Moon, Globe, Smile, Map, Settings, ShoppingCart,
  CreditCard, Truck, Package, Phone, Mail, MessageSquare, Send, Search, Trash,
  Edit, Eye, Plus, Minus, Clock, Video, Image, Folder, Tag, Share, Link,
  Bookmark, Award, Flag, Info, AlertCircle, AlertTriangle, BellRing
} from 'lucide-react';

// Define the predefined icons array
export const predefinedIcons = [
  { name: 'CheckSquare', icon: CheckSquare },
  { name: 'BookOpen', icon: BookOpen },
  { name: 'Coffee', icon: Coffee },
  { name: 'Dumbbell', icon: Dumbbell },
  { name: 'Star', icon: Star },
  { name: 'Heart', icon: Heart },
  { name: 'Trophy', icon: Trophy },
  { name: 'Target', icon: Target },
  { name: 'Activity', icon: Activity },
  { name: 'AlarmClock', icon: AlarmClock },
  { name: 'Bell', icon: Bell },
  { name: 'Calendar', icon: Calendar },
  { name: 'Camera', icon: Camera },
  { name: 'Music', icon: Music },
  { name: 'Cloud', icon: Cloud },
  { name: 'Home', icon: Home },
  { name: 'User', icon: User },
  { name: 'File', icon: File },
  { name: 'Gift', icon: Gift },
  { name: 'Zap', icon: Zap },
  { name: 'Store', icon: Store },
  { name: 'Book', icon: Book },
  { name: 'Sun', icon: Sun },
  { name: 'Moon', icon: Moon },
  { name: 'Globe', icon: Globe },
  { name: 'Smile', icon: Smile },
  { name: 'Map', icon: Map },
  { name: 'Settings', icon: Settings },
  { name: 'ShoppingCart', icon: ShoppingCart },
  { name: 'CreditCard', icon: CreditCard },
  { name: 'Truck', icon: Truck },
  { name: 'Package', icon: Package },
  { name: 'Phone', icon: Phone },
  { name: 'Mail', icon: Mail },
  { name: 'MessageSquare', icon: MessageSquare },
  { name: 'Send', icon: Send },
  { name: 'Search', icon: Search },
  { name: 'Trash', icon: Trash },
  { name: 'Edit', icon: Edit },
  { name: 'Eye', icon: Eye },
  { name: 'Plus', icon: Plus },
  { name: 'Minus', icon: Minus },
  { name: 'Clock', icon: Clock },
  { name: 'Video', icon: Video },
  { name: 'Image', icon: Image },
  { name: 'Folder', icon: Folder },
  { name: 'Tag', icon: Tag },
  { name: 'Share', icon: Share },
  { name: 'Link', icon: Link },
  { name: 'Bookmark', icon: Bookmark },
  { name: 'Award', icon: Award },
  { name: 'Flag', icon: Flag },
  { name: 'Info', icon: Info },
  { name: 'AlertCircle', icon: AlertCircle },
  { name: 'AlertTriangle', icon: AlertTriangle },
  { name: 'BellRing', icon: BellRing }
];

interface IconSelectorProps {
  selectedIconName: string | null;
  iconPreview: string | null;
  iconColor: string;
  onSelectIcon: (iconName: string) => void;
  onUploadIcon: () => void;
  onRemoveIcon: () => void;
  renderIcon?: (iconName: string) => React.ReactNode;
}

const IconSelector: React.FC<IconSelectorProps> = ({ 
  selectedIconName, 
  iconPreview, 
  iconColor,
  onSelectIcon, 
  onUploadIcon, 
  onRemoveIcon,
  renderIcon
}) => {
  const renderDefaultIcon = (iconName: string) => {
    const IconComponent = predefinedIcons.find(i => i.name === iconName)?.icon;
    if (!IconComponent) return null;
    return <IconComponent className="h-6 w-6" style={{ color: iconColor }} />;
  };

  const iconRenderer = renderIcon || renderDefaultIcon;

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
          {iconRenderer(selectedIconName)}
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

export default IconSelector;
