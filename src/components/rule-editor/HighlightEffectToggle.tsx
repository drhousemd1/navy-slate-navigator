
import React from 'react';
import { Switch } from '@/components/ui/switch';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
} from '@/components/ui/form';
import { Control } from 'react-hook-form';

interface HighlightEffectToggleProps {
  control: Control<any>;
}

const HighlightEffectToggle: React.FC<HighlightEffectToggleProps> = ({ control }) => {
  return (
    <FormField
      control={control}
      name="highlight_effect"
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between mt-4">
          <div className="space-y-0.5">
            <FormLabel className="text-white">Highlight Effect</FormLabel>
            <FormDescription className="text-gray-400">
              Apply a highlight behind title and description
            </FormDescription>
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  );
};

export default HighlightEffectToggle;
