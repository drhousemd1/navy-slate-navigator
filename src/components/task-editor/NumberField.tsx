
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from 'lucide-react';
import { Control } from 'react-hook-form';

interface NumberFieldProps {
  control: Control<any>;
  name: string;
  label: string;
  onIncrement: () => void;
  onDecrement: () => void;
  minValue?: number;
}

const NumberField: React.FC<NumberFieldProps> = ({ 
  control, 
  name, 
  label, 
  onIncrement, 
  onDecrement,
  minValue = 0
}) => {
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
              disabled={typeof minValue === 'number' && field.value <= minValue}
              className="border-light-navy bg-light-navy text-white hover:bg-navy"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <FormControl>
              <Input
                type="number"
                className="w-20 text-center bg-dark-navy border-light-navy text-white"
                {...field}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                  field.onChange(value);
                }}
              />
            </FormControl>
            <Button 
              type="button"
              variant="outline" 
              size="icon" 
              onClick={onIncrement}
              className="border-light-navy bg-light-navy text-white hover:bg-navy"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </FormItem>
      )}
    />
  );
};

export default NumberField;
