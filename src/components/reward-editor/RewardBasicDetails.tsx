
import React from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';
import { RewardFormValues } from '@/data/rewards/types';

interface RewardBasicDetailsProps {
  control: Control<RewardFormValues>;
  incrementCost: () => void;
  decrementCost: () => void;
}

const RewardBasicDetails: React.FC<RewardBasicDetailsProps> = ({
  control,
  incrementCost,
  decrementCost,
}) => {
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Reward Title</FormLabel>
            <FormControl>
              <Input
                placeholder="Reward title (e.g., Movie night, Massage)"
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
                placeholder="Detailed description of the reward" 
                className="bg-dark-navy border-light-navy text-white min-h-[100px]" 
                {...field} 
              />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="cost"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Cost (Points)</FormLabel>
            <FormControl>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={decrementCost}
                  className="h-10 w-10 bg-dark-navy border-light-navy text-white hover:bg-light-navy"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min="0"
                  className="bg-dark-navy border-light-navy text-white text-center"
                  {...field}
                  value={field.value || 0}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={incrementCost}
                  className="h-10 w-10 bg-dark-navy border-light-navy text-white hover:bg-light-navy"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="is_dom_reward"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <FormLabel className="text-white">Dom Reward</FormLabel>
              <p className="text-sm text-white">Only Dom can purchase and redeem this reward</p>
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

export default RewardBasicDetails;
