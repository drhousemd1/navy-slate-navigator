import React from 'react';
import { SketchPicker } from 'react-color';
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Control, useController } from 'react-hook-form';

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

interface PunishmentColorSettingsProps {
  control: Control<PunishmentFormValues>;
}

const PunishmentColorSettings: React.FC<PunishmentColorSettingsProps> = ({
  control,
}) => {
  return (
    <>
      <FormField
        control={control}
        name="title_color"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Title Color</FormLabel>
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
            <FormDescription className="text-white">Color of the title</FormDescription>
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="subtext_color"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Subtext Color</FormLabel>
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
            <FormDescription className="text-white">Color of the subtext</FormDescription>
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="calendar_color"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Calendar Color</FormLabel>
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
            <FormDescription className="text-white">Color of the calendar</FormDescription>
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="icon_color"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Icon Color</FormLabel>
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
            <FormDescription className="text-white">Color of the icon</FormDescription>
          </FormItem>
        )}
      />
    </>
  );
};

export default PunishmentColorSettings;