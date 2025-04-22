import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
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

interface FrequencySelectorProps {
  control: Control<TaskFormValues>;
}

const FrequencySelector: React.FC<FrequencySelectorProps> = ({ control }) => {
  const { field } = useController({
    name: 'frequency',
    control,
  });

  return (
    <FormField
      control={control}
      name="frequency"
      render={() => (
        <FormItem>
          <FormLabel className="text-white">Frequency</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger className="bg-dark-navy border-light-navy text-white">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
            </FormControl>
            <SelectContent className="bg-dark-navy border-light-navy text-white">
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
};

export default FrequencySelector;