import { useCoreTextClasses } from '@/components/common/useCoreTextClasses';
import React from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type FrequencyValue = 'once' | 'daily' | 'weekly';

interface FrequencySelectorProps<T extends FieldValues> {
  control: Control<T>;
  allowOnce?: boolean;
  onFrequencyChange?: (value: FrequencyValue) => void;
  name?: Path<T>;
}

const FrequencySelector = <T extends FieldValues>({ control, allowOnce = false, onFrequencyChange, name = 'frequency' as Path<T> }: FrequencySelectorProps<T>) => {
  const text = useCoreTextClasses();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className={text.primary}>Frequency</FormLabel>
          <Select
            onValueChange={(value) => { field.onChange(value as FrequencyValue); onFrequencyChange?.(value as FrequencyValue); }}
            value={field.value as string}
          >
            <FormControl>
              <SelectTrigger className={`bg-dark-navy border-light-navy ${text.primary}`}>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
            </FormControl>
            <SelectContent className={`bg-dark-navy border-light-navy ${text.primary}`}>
              {allowOnce && <SelectItem value="once" className="hover:bg-light-navy">One-time</SelectItem>}
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
