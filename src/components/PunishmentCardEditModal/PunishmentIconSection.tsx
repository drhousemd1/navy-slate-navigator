import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ImageIcon } from 'lucide-react';
import { PredefinedIconsGrid } from './FormFields';
import { Control } from 'react-hook-form';

// Define the PunishmentFormValues interface
export interface PunishmentFormValues {
  title: string;
  description?: string;
  points: number;
  icon_name?: string;
  icon_color?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  highlight_effect?: boolean;
  background_image_url?: string;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
}

interface PunishmentIconSectionProps {
  selectedIconName: string | null;
  iconPreview: string | null;
  iconColor: string;
  onSelectIcon: (iconName: string) => void;
  onUploadIcon: () => void;
  onRemoveIcon: () => void;
}

const PunishmentIconSection: React.FC<PunishmentIconSectionProps> = ({
  selectedIconName,
  iconPreview,
  iconColor,
  onSelectIcon,
  onUploadIcon,
  onRemoveIcon,
}) => {
  return (
    <div className="space-y-4">
      <FormLabel className="text-white text-lg">Punishment Icon</FormLabel>
      <div className="grid grid-cols-2 gap-4">
        <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
          <Avatar className="w-24 h-24 border-2 border-dashed border-light-navy rounded-full relative">
            {iconPreview ? (
              <AvatarImage src={iconPreview} alt="Custom Icon Preview" className="object-cover rounded-full" />
            ) : selectedIconName ? (
              <AvatarImage src={`/icons/${selectedIconName}.svg`} alt={`${selectedIconName} Icon`} className="object-contain rounded-full p-2" style={{ backgroundColor: iconColor }} />
            ) : (
              <AvatarFallback><ImageIcon /></AvatarFallback>
            )}
          </Avatar>

          <div className="flex flex-col space-y-2 mt-2">
            <Button variant="outline" size="sm" onClick={onUploadIcon}>
              Upload Custom Icon
            </Button>
            <Button variant="destructive" size="sm" onClick={onRemoveIcon} disabled={!iconPreview && !selectedIconName}>
              Remove Icon
            </Button>
          </div>
        </div>

        <PredefinedIconsGrid
          selectedIconName={selectedIconName}
          iconColor={iconColor}
          onSelectIcon={onSelectIcon}
        />
      </div>
    </div>
  );
};

export default PunishmentIconSection;