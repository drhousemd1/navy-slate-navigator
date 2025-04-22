
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Control } from 'react-hook-form';

interface ColorPickerFieldProps {
  control: Control<any>;
  name: string;
  label: string;
}

const ColorPickerField: React.FC<ColorPickerFieldProps> = ({ control, name, label }) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-white">{label}</FormLabel>
          <div className="flex items-center space-x-2">
            <div 
              className="w-6 h-6 rounded-full border border-white" 
              style={{ backgroundColor: field.value }}
            />
            <FormControl>
              <Input
                type="color"
                className="w-full h-10 bg-dark-navy border-light-navy"
                {...field}
              />
            </FormControl>
          </div>
        </FormItem>
      )}
    />
  );
};

export default ColorPickerField;
