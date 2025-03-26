
import React from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import NumberField from '../task-editor/NumberField';

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
