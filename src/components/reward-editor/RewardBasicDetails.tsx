import React from 'react';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import NumberField from '@/components/task-editor/NumberField'; // Reusing NumberField
import { Control, UseFormWatch } from 'react-hook-form';
import { RewardFormValues } from '@/data/rewards/types';

interface RewardBasicDetailsProps {
  control: Control<RewardFormValues>;
  incrementCost: () => void;
  decrementCost: () => void;
  incrementSupply: () => void;
  decrementSupply: () => void;
  watch: UseFormWatch<RewardFormValues>; // Typed watch
}

const RewardBasicDetails: React.FC<RewardBasicDetailsProps> = ({
  control,
  incrementCost,
  decrementCost,
  incrementSupply,
  decrementSupply,
  watch,
}) => {
  const isDomReward = watch('is_dom_reward');

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Title</FormLabel>
            <FormControl>
              <Input placeholder="Reward title" className="bg-dark-navy border-light-navy text-white" {...field} />
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
              <Textarea placeholder="Reward description" className="bg-dark-navy border-light-navy text-white min-h-[100px]" {...field} value={field.value || ''} />
            </FormControl>
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NumberField
          control={control}
          name="cost"
          label="Cost"
          onIncrement={incrementCost}
          onDecrement={decrementCost}
          minValue={0}
        />
        <NumberField
          control={control}
          name="supply" // Add supply field
          label="Supply (0 for unlimited)"
          onIncrement={incrementSupply}
          onDecrement={decrementSupply}
          minValue={0}
        />
      </div>
      <FormField
        control={control}
        name="is_dom_reward"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-light-navy p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base text-white">
                Dom Reward
              </FormLabel>
              <p className="text-sm text-muted-foreground text-light-navy">
                Is this reward for the Dominant partner?
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

export default RewardBasicDetails;
