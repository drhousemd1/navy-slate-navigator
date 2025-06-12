
import React from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface ColorPickerFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
}

const ColorPickerField = <T extends FieldValues>({ control, name, label }: ColorPickerFieldProps<T>) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-white">{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal bg-dark-navy border-light-navy text-white hover:bg-light-navy"
                  style={{ backgroundColor: field.value }}
                >
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-dark-navy border-light-navy" align="start">
              <Input
                type="color"
                className="p-0 m-0 border-none w-full h-10 cursor-pointer"
                value={field.value || '#FFFFFF'}
                onChange={(e) => field.onChange(e.target.value)}
              />
            </PopoverContent>
          </Popover>
        </FormItem>
      )}
    />
  );
};

export default ColorPickerField;
