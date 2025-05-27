import React from 'react';
import { Control, Controller, UseFormWatch } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from '../ui/button';
import { Minus, Plus } from 'lucide-react';
import { RewardFormValues } from '@/data/rewards/types';

interface RewardBasicDetailsProps {
  control: Control<RewardFormValues>;
  incrementCost: () => void;
  decrementCost: () => void;
  incrementSupply: () => void;
  decrementSupply: () => void;
  watch: UseFormWatch<RewardFormValues>;
}

const RewardBasicDetails: React.FC<RewardBasicDetailsProps> = ({ 
  control, 
  incrementCost, 
  decrementCost,
  incrementSupply,
  decrementSupply,
  watch
}) => {
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Title</FormLabel>
            <FormControl>
              <Input placeholder="Reward title" {...field} className="bg-dark-navy border-light-navy text-white" />
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
              <Textarea placeholder="Reward description" {...field} value={field.value || ''} className="bg-dark-navy border-light-navy text-white min-h-[100px]" />
            </FormControl>
          </FormItem>
        )}
      />
      
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="cost"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Cost (Points)</FormLabel>
              <div className="flex items-center">
                <Button type="button" variant="outline" size="icon" onClick={decrementCost} className="mr-2 bg-dark-navy border-light-navy text-white hover:bg-light-navy">
                  <Minus className="h-4 w-4" />
                </Button>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    className="text-center bg-dark-navy border-light-navy text-white"
                  />
                </FormControl>
                <Button type="button" variant="outline" size="icon" onClick={incrementCost} className="ml-2 bg-dark-navy border-light-navy text-white hover:bg-light-navy">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="supply"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Supply</FormLabel>
              <div className="flex items-center">
                <Button type="button" variant="outline" size="icon" onClick={decrementSupply} className="mr-2 bg-dark-navy border-light-navy text-white hover:bg-light-navy">
                  <Minus className="h-4 w-4" />
                </Button>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    value={watch('supply')}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    className="text-center bg-dark-navy border-light-navy text-white"
                  />
                </FormControl>
                <Button type="button" variant="outline" size="icon" onClick={incrementSupply} className="ml-2 bg-dark-navy border-light-navy text-white hover:bg-light-navy">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <FormDescription className="text-xs text-gray-400">
                Set to 0 for unlimited supply.
              </FormDescription>
            </FormItem>
          )}
        />
      </div>
      
      <FormField
        control={control}
        name="is_dom_reward"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-light-navy p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base text-white">
                Dominant Reward
              </FormLabel>
              <FormDescription className="text-gray-400">
                Is this a reward for the dominant partner?
              </FormDescription>
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
