import React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

interface PrioritySelectorProps {
  control: Control<TaskFormValues>;
}

const PrioritySelector: React.FC<PrioritySelectorProps> = ({ control }) => {
  const { field } = useController({
    name: 'priority',
    control,
  });

  return (
    <FormField
      control={control}
      name="priority"
      render={() => (
        <FormItem>
          <FormLabel className="text-white">Priority</FormLabel>
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value}
              className="flex flex-col space-y-1"
            >
              <FormItem className="flex items-center space-x-3 space-y-0">
                <FormControl>
                  <RadioGroupItem value="low" id="priority_low" />
                </FormControl>
                <FormLabel htmlFor="priority_low" className="text-white">Low</FormLabel>
              </FormItem>
              <FormItem className="flex items-center space-x-3 space-y-0">
                <FormControl>
                  <RadioGroupItem value="medium" id="priority_medium" />
                </FormControl>
                <FormLabel htmlFor="priority_medium" className="text-white">Medium</FormLabel>
              </FormItem>
              <FormItem className="flex items-center space-x-3 space-y-0">
                <FormControl>
                  <RadioGroupItem value="high" id="priority_high" />
                </FormControl>
                <FormLabel htmlFor="priority_high" className="text-white">High</FormLabel>
              </FormItem>
            </RadioGroup>
          </FormControl>
        </FormItem>
      )}
    />
  );
};

export default PrioritySelector;