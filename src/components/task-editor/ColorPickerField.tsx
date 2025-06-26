
import React, { useRef } from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ColorPickerFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  defaultColor?: string;
}

const ColorPickerField = <T extends FieldValues>({ 
  control, 
  name, 
  label, 
  defaultColor = '#FFFFFF' 
}: ColorPickerFieldProps<T>) => {
  const colorInputRef = useRef<HTMLInputElement>(null);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        // Ensure we always have a valid color value
        const currentColor = field.value || defaultColor;
        
        return (
          <FormItem>
            <FormLabel className="text-white">{label}</FormLabel>
            <FormControl>
              <div className="flex items-center gap-2">
                {/* Hidden color input that can receive clicks */}
                <input
                  ref={colorInputRef}
                  type="color"
                  value={currentColor}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="opacity-0 absolute w-0 h-0"
                />
                
                {/* Color preview button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-12 h-10 p-0 border-light-navy hover:bg-light-navy"
                  style={{ backgroundColor: currentColor }}
                  onClick={() => colorInputRef.current?.click()}
                >
                  {/* Empty button with color background */}
                </Button>
                
                {/* Text input showing the hex value */}
                <Input
                  type="text"
                  value={currentColor}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Validate hex color format
                    if (/^#[0-9A-Fa-f]{6}$/.test(value) || value === '') {
                      field.onChange(value || defaultColor);
                    }
                  }}
                  placeholder="#FFFFFF"
                  className="flex-1 bg-dark-navy border-light-navy text-white font-mono text-sm"
                />
              </div>
            </FormControl>
          </FormItem>
        );
      }}
    />
  );
};

export default ColorPickerField;
