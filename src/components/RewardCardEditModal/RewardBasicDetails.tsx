import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { Control, useController } from 'react-hook-form';

// Define the RewardFormValues interface ( duplicated from RewardEditForm.tsx to avoid circular dependencies )
interface RewardFormValues {
    title: string;
    description: string;
    cost: number;
    background_image_url: string | null;
    background_opacity: number;
    focal_point_x: number;
    focal_point_y: number;
    title_color: string;
    subtext_color: string;
    calendar_color: string;
    highlight_effect: boolean;
    icon_color: string;
}

interface RewardBasicDetailsProps {
  control: Control<RewardFormValues>;
  incrementCost: () => void;
  decrementCost: () => void;
}

const RewardBasicDetails: React.FC<RewardBasicDetailsProps> = ({
  control,
  incrementCost,
  decrementCost,
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
              <Input placeholder="Reward title" className="bg-dark-navy border-light-navy text-white" {...field} />
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
              <Input placeholder="Reward description" className="bg-dark-navy border-light-navy text-white" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="cost"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Cost</FormLabel>
            <FormControl>
              <div className="flex items-center space-x-2">
                <Button type="button" variant="outline" size="icon" onClick={decrementCost}>
                  -
                </Button>
                <Input
                  type="number"
                  className="w-20 text-center bg-dark-navy border-light-navy text-white"
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
                <Button type="button" variant="outline" size="icon" onClick={incrementCost}>
                  +
                </Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

export default RewardBasicDetails;