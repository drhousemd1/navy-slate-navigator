
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Control } from 'react-hook-form';
import NumberField from '../task-editor/NumberField';
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";

interface RewardBasicDetailsProps {
  control: Control<any>;
  incrementCost: () => void;
  decrementCost: () => void;
}

const RewardBasicDetails: React.FC<RewardBasicDetailsProps> = ({ 
  control, 
  incrementCost, 
  decrementCost
}) => {
  return (
    <>
      <FormField
        control={control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Title</FormLabel>
            <FormControl>
              <Input 
                placeholder="Reward title" 
                className="bg-dark-navy border-light-navy text-white" 
                {...field} 
              />
            </FormControl>
          </FormItem>
        )}
      />
      
      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Description</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Reward description" 
                className="bg-dark-navy border-light-navy text-white min-h-[100px]" 
                {...field} 
              />
            </FormControl>
          </FormItem>
        )}
      />
      
      <FormField
        control={control}
        name="is_dom_reward"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className="text-white">Reward Type</FormLabel>
            <FormControl>
              <RadioGroup 
                onValueChange={(value) => field.onChange(value === "true")} 
                value={field.value ? "true" : "false"}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="submissive" value="false" />
                  <Label htmlFor="submissive" className="text-white">Submissive Reward</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="dominant" value="true" />
                  <Label htmlFor="dominant" className="text-white">Dominant Reward</Label>
                </div>
              </RadioGroup>
            </FormControl>
          </FormItem>
        )}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NumberField
          control={control}
          name="cost"
          label="Cost (Points)"
          onIncrement={incrementCost}
          onDecrement={decrementCost}
          minValue={0}
        />
      </div>
    </>
  );
};

export default RewardBasicDetails;
