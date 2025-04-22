import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
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

interface PunishmentBasicDetailsProps {
  control: Control<PunishmentFormValues>;
  setValue: any; // React Hook Form setValue function
}

const PunishmentBasicDetails: React.FC<PunishmentBasicDetailsProps> = ({
  control,
  setValue
}) => {
  return (
    <>
      <FormField
        control={control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Title</FormLabel>
            <FormControl>
              <Input placeholder="Punishment title" className="bg-dark-navy border-light-navy text-white" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Description</FormLabel>
            <FormControl>
              <Input placeholder="Punishment description" className="bg-dark-navy border-light-navy text-white" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="points"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Points</FormLabel>
            <FormControl>
              <Input type="number" placeholder="0" className="bg-dark-navy border-light-navy text-white" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

export default PunishmentBasicDetails;