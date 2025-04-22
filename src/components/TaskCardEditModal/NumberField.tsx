import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

interface NumberFieldProps {
  control: Control<TaskFormValues>;
  name: keyof TaskFormValues;
  label: string;
  onIncrement: () => void;
  onDecrement: () => void;
  minValue?: number;
}

const NumberField: React.FC<NumberFieldProps> = ({
  control,
  name,
  label,
  onIncrement,
  onDecrement,
  minValue = 0,
}) => {
  const { field } = useController({
    name,
    control,
  });

  return (
    <FormField
      control={control}
      name={name}
      render={() => (
        <FormItem>
          <FormLabel className="text-white">{label}</FormLabel>
          <FormControl>
            <div className="flex items-center space-x-2">
              <Button type="button" variant="outline" size="icon" onClick={onDecrement}>
                -
              </Button>
              <Input
                type="number"
                className="w-20 text-center bg-dark-navy border-light-navy text-white"
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value))}
                min={minValue}
              />
              <Button type="button" variant="outline" size="icon" onClick={onIncrement}>
                +
              </Button>
            </div>
          </FormControl>
        </FormItem>
      )}
    />
  );
};

export default NumberField;