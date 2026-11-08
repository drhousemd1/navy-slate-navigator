
import React from 'react';
import { Control, FieldValues, Path } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from '@/components/ui/input';

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
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        // Ensure we always have a valid color value
        const currentColor = field.value || defaultColor;
        
        return (
          <FormItem>
            <FormLabel className="text-white">{label}</FormLabel>
            <div className="flex items-center gap-2">
                {/* Direct color input styled as a button */}
                <FormControl>
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="w-12 h-10 rounded border border-light-navy cursor-pointer bg-transparent"
                    style={{
                      backgroundColor: currentColor,
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none'
                    }}
                  />
                </FormControl>
                
                {/* Text input showing the hex value */}
                <Input
                  type="text"
                  aria-label={`${label} hex value`}
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
          </FormItem>
        );
      }}
    />
  );
};

export default ColorPickerField;
