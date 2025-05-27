import React, { useEffect } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Control } from 'react-hook-form';
import { logger } from '@/lib/logger';

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
                placeholder="Enter reward title" 
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
                placeholder="Enter reward description" 
                className="bg-dark-navy border-light-navy text-white min-h-[100px]"
                {...field} 
              />
            </FormControl>
          </FormItem>
        )}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="cost"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Cost</FormLabel>
              <div className="flex items-center space-x-2">
                <Button 
                  type="button"
                  variant="outline"
                  className="bg-dark-navy border-light-navy text-white h-10 px-3"
                  onClick={decrementCost}
                >
                  -
                </Button>
                <FormControl>
                  <Input 
                    type="number"
                    className="bg-dark-navy border-light-navy text-white text-center"
                    {...field}
                    value={field.value}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <Button 
                  type="button"
                  variant="outline"
                  className="bg-dark-navy border-light-navy text-white h-10 px-3"
                  onClick={incrementCost}
                >
                  +
                </Button>
              </div>
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name="is_dom_reward"
          render={({ field }) => {
            logger.log("Rendering is_dom_reward switch with value:", field.value);
            return (
              <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border border-light-navy p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-white">Reward Type</FormLabel>
                  <FormDescription className="text-gray-400">
                    {field.value ? "Dominant Reward" : "Submissive Reward"}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      logger.log("Switch toggled to:", checked);
                      field.onChange(checked);
                    }}
                  />
                </FormControl>
              </FormItem>
            );
          }}
        />
      </div>
    </>
  );
};

export default RewardBasicDetails;
