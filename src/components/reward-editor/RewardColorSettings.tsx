import React from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import ColorPickerField from '@/components/task-editor/ColorPickerField'; // Reusing ColorPickerField
import { RewardFormValues } from '@/data/rewards/types';

interface RewardColorSettingsProps {
  control: Control<RewardFormValues>; // Typed control
}

const RewardColorSettings: React.FC<RewardColorSettingsProps> = ({ control }) => {
  return (
    <div className="space-y-6"> {/* Increased spacing for sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Changed to 3 columns for better fit */}
        <ColorPickerField 
          control={control} 
          name="title_color" 
          label="Title Color" 
        />
        <ColorPickerField 
          control={control} 
          name="subtext_color" 
          label="Subtext Color" 
        />
        <ColorPickerField 
          control={control} 
          name="calendar_color" 
          label="Calendar Color" 
        />
        {/* Icon color is handled in RewardIconSection, so it's not duplicated here */}
      </div>
      
      <FormField
        control={control}
        name="highlight_effect"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-light-navy p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base text-white">Highlight Effect</FormLabel>
              <p className="text-sm text-muted-foreground text-light-navy">
                Apply a yellow highlight behind title and description.
              </p>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
};

export default RewardColorSettings;
