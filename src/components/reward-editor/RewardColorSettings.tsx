
import React from 'react';
import { Control } from 'react-hook-form';
import { FormLabel } from '@/components/ui/form';
import ColorPickerField from '@/components/task-editor/ColorPickerField';
import { Switch } from '@/components/ui/switch';
import { FormField, FormItem, FormControl } from '@/components/ui/form';
import { RewardFormValues } from '@/data/rewards/types';

interface RewardColorSettingsProps {
  control: Control<RewardFormValues>;
}

const RewardColorSettings: React.FC<RewardColorSettingsProps> = ({ control }) => {
  return (
    <div className="space-y-4">
      <FormLabel className="text-white text-lg">Color Settings</FormLabel>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ColorPickerField control={control} name="title_color" label="Title Color" />
        <ColorPickerField control={control} name="subtext_color" label="Subtext Color" />
        <ColorPickerField control={control} name="calendar_color" label="Calendar Color" />
        <ColorPickerField control={control} name="icon_color" label="Icon Color" />
      </div>

      <FormField
        control={control}
        name="highlight_effect"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <FormLabel className="text-white">Highlight Effect</FormLabel>
              <p className="text-sm text-white">Apply a yellow highlight behind title and description</p>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
};

export default RewardColorSettings;
