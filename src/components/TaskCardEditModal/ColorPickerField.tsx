import React from 'react';
import { SketchPicker } from 'react-color';
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Control, useController } from 'react-hook-form';

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

interface ColorPickerFieldProps {
  control: Control<TaskFormValues>;
  name: keyof TaskFormValues;
  label: string;
  description?: string;
}

const ColorPickerField: React.FC<ColorPickerFieldProps> = ({
  control,
  name,
  label,
  description,
}) => {
  const { field } = useController({
    name,
    control,
  });

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-white">{label}</FormLabel>
          {description && <FormDescription className="text-white">{description}</FormDescription>}
          <FormControl>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[80px] h-[30px] rounded-md border shadow-sm"
                  style={{ backgroundColor: field.value, color: 'white' }}
                >
                  {field.value}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <SketchPicker
                  color={field.value}
                  onChange={(color) => field.onChange(color.hex)}
                />
              </PopoverContent>
            </Popover>
          </FormControl>
        </FormItem>
      )}
    />
  );
};

export default ColorPickerField;