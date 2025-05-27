import React from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form'; // Import FieldValues and Path
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// Ensure TaskPriority and RulePriority are compatible or use a union if they differ significantly.
// For simplicity, assuming 'low' | 'medium' | 'high' is common.
type PriorityValue = 'low' | 'medium' | 'high';

interface PrioritySelectorProps<T extends FieldValues> { // Make component generic
  control: Control<T>; // Use generic Control
  name?: Path<T>; // Use generic Path for name, make optional to match TaskEditorForm usage
}

const PrioritySelector = <T extends FieldValues>({ control, name = 'priority' as Path<T> }: PrioritySelectorProps<T>) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-white">Priority</FormLabel>
          <Select 
            onValueChange={(value) => field.onChange(value as PriorityValue)} 
            defaultValue={field.value as string}
          >
            <FormControl>
              <SelectTrigger className="bg-dark-navy border-light-navy text-white">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
            </FormControl>
            <SelectContent className="bg-dark-navy border-light-navy text-white">
              <SelectItem value="low" className="hover:bg-light-navy">Low</SelectItem>
              <SelectItem value="medium" className="hover:bg-light-navy">Medium</SelectItem>
              <SelectItem value="high" className="hover:bg-light-navy">High</SelectItem>
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
};

export default PrioritySelector;
