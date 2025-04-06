
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { Control } from 'react-hook-form';
import { EncyclopediaEntry } from '@/types/encyclopedia';

interface OpacitySliderProps {
  control: Control<EncyclopediaEntry>;
  name: 'opacity' | 'popup_opacity';
  label: string;
}

const OpacitySlider: React.FC<OpacitySliderProps> = ({ control, name, label }) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel className="text-white">{label} ({field.value}%)</FormLabel>
          <FormControl>
            <Slider
              value={[field.value]}
              min={0}
              max={100}
              step={1}
              onValueChange={(values) => field.onChange(values[0])}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
};

export default OpacitySlider;
