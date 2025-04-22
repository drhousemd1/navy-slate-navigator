import React, { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from '@/hooks/use-toast';
import { PredefinedIcons } from './predefinedIcons';
import { ImageIcon } from 'lucide-react';
import { PredefinedIconsGrid } from './PredefinedIconsGrid';
import { Control } from 'react-hook-form';

// Define the TaskFormValues interface ( duplicated from TaskEditForm.tsx to avoid circular dependencies )
interface TaskFormValues {
  title: string;
  description: string;
  points: number;
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  background_image_url?: string;
  background_opacity: number;
  icon_url?: string;
  icon_name?: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  priority: 'low' | 'medium' | 'high';
}

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
  onRemoveIcon,
}) => {
  return (
    <div className="space-y-2">
      <Avatar className="w-24 h-24 border-2 border-dashed border-light-navy rounded-full relative">
        {iconPreview ? (
          <AvatarImage src={iconPreview} alt="Custom Icon Preview" className="object-cover rounded-full" />
        ) : selectedIconName ? (
          <AvatarImage src={`/icons/${selectedIconName}.svg`} alt={`${selectedIconName} Icon`} className="object-contain rounded-full p-2" style={{ backgroundColor: iconColor }} />
        ) : (
          <AvatarFallback><ImageIcon /></AvatarFallback>
        )}
      </Avatar>

      <div className="flex flex-col space-y-2">
        <Button variant="outline" size="sm" onClick={onUploadIcon}>
          Upload Custom Icon
        </Button>
        <Button variant="destructive" size="sm" onClick={onRemoveIcon} disabled={!iconPreview && !selectedIconName}>
          Remove Icon
        </Button>
      </div>
    </div>
  );
};

export default IconSelector;