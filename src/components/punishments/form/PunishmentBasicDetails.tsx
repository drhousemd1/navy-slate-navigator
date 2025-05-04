
import React, { useCallback } from 'react';
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
  // Using useCallback to prevent recreating these functions on every render
  const handleDecrementPoints = useCallback(() => {
    // Direct implementation that explicitly sets the value rather than using a callback
    const currentPoints = control._formValues.points;
    console.log('Current points before decrement:', currentPoints);
    const numericPoints = typeof currentPoints === 'number' ? currentPoints : parseInt(String(currentPoints || 0), 10);
    const newValue = Math.max(0, numericPoints - 1); // Ensure we only subtract 1
    console.log('Setting points to:', newValue);
    setValue('points', newValue, { shouldValidate: true });
  }, [control._formValues.points, setValue]);

  const handleIncrementPoints = useCallback(() => {
    const currentPoints = control._formValues.points;
    console.log('Current points before increment:', currentPoints);
    const numericPoints = typeof currentPoints === 'number' ? currentPoints : parseInt(String(currentPoints || 0), 10);
    const newValue = numericPoints + 1; // Ensure we only add 1
    console.log('Setting points to:', newValue);
    setValue('points', newValue, { shouldValidate: true });
  }, [control._formValues.points, setValue]);
  
  const handleDecrementDomPoints = useCallback(() => {
    const currentDomPoints = control._formValues.dom_points;
    console.log('Current dom points before decrement:', currentDomPoints);
    const numericDomPoints = typeof currentDomPoints === 'number' ? currentDomPoints : parseInt(String(currentDomPoints || 0), 10);
    const newValue = Math.max(0, numericDomPoints - 1); // Ensure we only subtract 1
    console.log('Setting dom_points to:', newValue);
    setValue('dom_points', newValue, { shouldValidate: true });
  }, [control._formValues.dom_points, setValue]);

  const handleIncrementDomPoints = useCallback(() => {
    const currentDomPoints = control._formValues.dom_points;
    console.log('Current dom points before increment:', currentDomPoints);
    const numericDomPoints = typeof currentDomPoints === 'number' ? currentDomPoints : parseInt(String(currentDomPoints || 0), 10);
    const newValue = numericDomPoints + 1; // Ensure we only add 1
    console.log('Setting dom_points to:', newValue);
    setValue('dom_points', newValue, { shouldValidate: true });
  }, [control._formValues.dom_points, setValue]);

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
      
      {/* Submissive Points Lost field - completely rewritten with direct value setting */}
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
                  step="1"
                  min="0"
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
      
      {/* Dom Points Earned field - completely rewritten with direct value setting */}
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
                  step="1"
                  min="0"
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
