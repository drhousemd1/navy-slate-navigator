
import React from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import NumberField from '../../task-editor/NumberField';

interface PunishmentBasicDetailsProps {
  control: Control<any>;
  setValue: UseFormSetValue<any>;
}

const PunishmentBasicDetails: React.FC<PunishmentBasicDetailsProps> = ({ control, setValue }) => {
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
                placeholder="Punishment title" 
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
                placeholder="Punishment description" 
                className="bg-dark-navy border-light-navy text-white min-h-[100px]" 
                {...field} 
              />
            </FormControl>
          </FormItem>
        )}
      />

      <NumberField
        control={control}
        name="points"
        label="Points"
        onIncrement={() => {
          const currentPoints = control._getWatch('points') || 0;
          setValue('points', currentPoints + 1);
        }}
        onDecrement={() => {
          const currentPoints = control._getWatch('points') || 0;
          setValue('points', Math.max(0, currentPoints - 1));
        }}
        minValue={0}
      />
    </>
  );
};

export default PunishmentBasicDetails;
