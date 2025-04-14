
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CircleAlert, Flag, CircleCheck } from 'lucide-react';
import { Control } from 'react-hook-form';

interface PrioritySelectorProps {
  control: Control<any>;
}

const PrioritySelector: React.FC<PrioritySelectorProps> = ({ control }) => {
  return (
    <FormField
      control={control}
      name="priority"
      render={({ field }) => (
        <FormItem className="space-y-3">
          <FormLabel className="text-white">Priority</FormLabel>
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem 
                  value="high" 
                  id="high" 
                  className="text-red-500 border-red-500" 
                />
                <Label htmlFor="high" className="flex items-center gap-2 text-white">
                  <CircleAlert className="h-4 w-4 text-red-500" />
                  High Priority
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem 
                  value="medium" 
                  id="medium" 
                  className="text-yellow-500 border-yellow-500" 
                />
                <Label htmlFor="medium" className="flex items-center gap-2 text-white">
                  <Flag className="h-4 w-4 text-yellow-500" />
                  Medium Priority
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem 
                  value="low" 
                  id="low" 
                  className="text-green-500 border-green-500" 
                />
                <Label htmlFor="low" className="flex items-center gap-2 text-white">
                  <CircleCheck className="h-4 w-4 text-green-500" />
                  Low Priority
                </Label>
              </div>
            </RadioGroup>
          </FormControl>
        </FormItem>
      )}
    />
  );
};

export default PrioritySelector;
