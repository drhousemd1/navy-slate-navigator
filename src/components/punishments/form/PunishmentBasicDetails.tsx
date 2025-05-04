
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Control } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';
import { PunishmentFormValues } from './PunishmentFormProvider';

interface PunishmentBasicDetailsProps {
  control: Control<PunishmentFormValues>;
  setValue: any;
}

const PunishmentBasicDetails: React.FC<PunishmentBasicDetailsProps> = ({ control, setValue }) => {
  // Completely rewritten increment/decrement functions to force exactly +1/-1 change
  const handleDecrementPoints = () => {
    setValue('points', (val: number) => {
      console.log('Current points before decrement:', val);
      const newValue = parseInt(String(val)) - 1;
      console.log('New points after decrement:', Math.max(0, newValue));
      return Math.max(0, newValue);
    });
  };

  const handleIncrementPoints = () => {
    setValue('points', (val: number) => {
      console.log('Current points before increment:', val);
      const newValue = parseInt(String(val)) + 1;
      console.log('New points after increment:', newValue);
      return newValue;
    });
  };
  
  const handleDecrementDomPoints = () => {
    setValue('dom_points', (val: number) => {
      console.log('Current dom points before decrement:', val);
      const newValue = parseInt(String(val)) - 1;
      console.log('New dom points after decrement:', Math.max(0, newValue));
      return Math.max(0, newValue);
    });
  };

  const handleIncrementDomPoints = () => {
    setValue('dom_points', (val: number) => {
      console.log('Current dom points before increment:', val);
      const newValue = parseInt(String(val)) + 1;
      console.log('New dom points after increment:', newValue);
      return newValue;
    });
  };

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Title</FormLabel>
            <FormControl>
              <Input 
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
                className="bg-dark-navy border-light-navy text-white" 
                {...field} 
              />
            </FormControl>
          </FormItem>
        )}
      />
      
      {/* Submissive Points Lost field - completely rewritten handlers */}
      <FormField
        control={control}
        name="points"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Submissive Points Lost</FormLabel>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="icon"
                type="button"
                onClick={handleDecrementPoints}
                className="bg-light-navy hover:bg-navy border-light-navy"
              >
                <Minus className="h-4 w-4 text-white" />
              </Button>
              <FormControl>
                <Input
                  type="number"
                  className="bg-dark-navy border-light-navy text-white text-center w-20"
                  {...field}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value)) {
                      field.onChange(Math.max(0, value));
                    } else {
                      field.onChange(0);
                    }
                  }}
                />
              </FormControl>
              <Button 
                variant="outline" 
                size="icon"
                type="button"
                onClick={handleIncrementPoints}
                className="bg-light-navy hover:bg-navy border-light-navy"
              >
                <Plus className="h-4 w-4 text-white" />
              </Button>
            </div>
          </FormItem>
        )}
      />
      
      {/* Dom Points Earned field - completely rewritten handlers */}
      <FormField
        control={control}
        name="dom_points"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Dom Points Earned</FormLabel>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="icon"
                type="button"
                onClick={handleDecrementDomPoints}
                className="bg-light-navy hover:bg-navy border-light-navy"
              >
                <Minus className="h-4 w-4 text-white" />
              </Button>
              <FormControl>
                <Input
                  type="number"
                  className="bg-dark-navy border-light-navy text-white text-center w-20"
                  {...field}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value)) {
                      field.onChange(Math.max(0, value));
                    } else {
                      field.onChange(0);
                    }
                  }}
                />
              </FormControl>
              <Button 
                variant="outline" 
                size="icon"
                type="button"
                onClick={handleIncrementDomPoints}
                className="bg-light-navy hover:bg-navy border-light-navy"
              >
                <Plus className="h-4 w-4 text-white" />
              </Button>
            </div>
          </FormItem>
        )}
      />
    </div>
  );
};

export default PunishmentBasicDetails;
