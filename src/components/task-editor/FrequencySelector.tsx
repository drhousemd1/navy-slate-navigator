import React from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// Assuming 'daily' | 'weekly' is common.
type FrequencyValue = 'daily' | 'weekly';

interface FrequencySelectorProps<T extends FieldValues> {
  control: Control<T>;
  name?: Path<T>;
}

const FrequencySelector = <T extends FieldValues>({ control, name = 'frequency' as Path<T> }: FrequencySelectorProps<T>) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-white">Frequency</FormLabel>
          <Select 
            onValueChange={(value) => field.onChange(value as FrequencyValue)} 
            defaultValue={field.value as string}
          >
            <FormControl>
              <SelectTrigger className="bg-dark-navy border-light-navy text-white">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
            </FormControl>
            <SelectContent className="bg-dark-navy border-light-navy text-white">
              <SelectItem value="daily" className="hover:bg-light-navy">Daily</SelectItem>
              <SelectItem value="weekly" className="hover:bg-light-navy">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
};

export default FrequencySelector;
