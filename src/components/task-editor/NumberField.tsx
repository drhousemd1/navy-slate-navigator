import React from 'react';
import { Control, Controller, FieldValues, Path, UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

interface NumberFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  onIncrement: () => void;
  onDecrement: () => void;
  minValue?: number;
  maxValue?: number;
  step?: number;
  disabled?: boolean;
}

const NumberField = <T extends FieldValues>({
  control,
  name,
  label,
  onIncrement,
  onDecrement,
  minValue = 0,
  maxValue,
  step = 1,
  disabled = false,
}: NumberFieldProps<T>) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-white">{label}</FormLabel>
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onDecrement}
              className="bg-light-navy hover:bg-navy border-light-navy"
              disabled={disabled || (minValue !== undefined && Number(field.value) <= minValue)}
            >
              <Minus className="h-4 w-4 text-white" />
            </Button>
            <FormControl>
              <Input
                type="number"
                className="bg-dark-navy border-light-navy text-white text-center w-20"
                {...field}
                value={field.value || 0}
                onChange={(e) => {
                  let numValue = parseInt(e.target.value, 10);
                  if (isNaN(numValue)) numValue = minValue !== undefined ? minValue : 0;
                  if (minValue !== undefined) numValue = Math.max(minValue, numValue);
                  if (maxValue !== undefined) numValue = Math.min(maxValue, numValue);
                  field.onChange(numValue);
                }}
                step={step}
                min={minValue}
                max={maxValue}
                disabled={disabled}
              />
            </FormControl>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onIncrement}
              className="bg-light-navy hover:bg-navy border-light-navy"
              disabled={disabled || (maxValue !== undefined && Number(field.value) >= maxValue)}
            >
              <Plus className="h-4 w-4 text-white" />
            </Button>
          </div>
        </FormItem>
      )}
    />
  );
};

export default NumberField;
