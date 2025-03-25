
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Control } from 'react-hook-form';

interface FrequencySelectorProps {
  control: Control<any>;
}

const FrequencySelector: React.FC<FrequencySelectorProps> = ({ control }) => {
  return (
    <FormField
      control={control}
      name="frequency"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-white">Frequency</FormLabel>
          <Select 
            onValueChange={field.onChange}
            defaultValue={field.value}
          >
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
