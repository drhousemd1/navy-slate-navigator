import React, { useCallback } from 'react';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Control } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';
import { PunishmentFormValues } from './PunishmentFormProvider';
import { logger } from '@/lib/logger';

interface PunishmentBasicDetailsProps {
  control: Control<PunishmentFormValues>;
  setValue: any;
  isSaving?: boolean;
}

const PunishmentBasicDetails: React.FC<PunishmentBasicDetailsProps> = ({ 
  control, 
  setValue, 
  isSaving = false 
}) => {
  // Using useCallback to prevent recreating these functions on every render
  const handleDecrementPoints = useCallback((e: React.MouseEvent) => {
    // Prevent any form submission
    e.preventDefault();
    e.stopPropagation();
    
    // Skip updating if saving is in progress
    if (isSaving) return;
    
    // Get current value and ensure it's a number
    const currentPoints = control._formValues.points;
    logger.debug('Current points before decrement:', currentPoints);
    
    const numericPoints = typeof currentPoints === 'number' 
      ? currentPoints 
      : parseInt(String(currentPoints || 0), 10);
    
    // Ensure we only subtract 1 and don't go below 0
    const newValue = Math.max(0, numericPoints - 1);
    logger.debug('Setting points to:', newValue);
    
    // Use setValue with explicit options to ensure proper form update
    setValue('points', newValue, { 
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    });
  }, [control._formValues.points, setValue, isSaving]);

  const handleIncrementPoints = useCallback((e: React.MouseEvent) => {
    // Prevent any form submission
    e.preventDefault();
    e.stopPropagation();
    
    // Skip updating if saving is in progress
    if (isSaving) return;
    
    // Get current value and ensure it's a number
    const currentPoints = control._formValues.points;
    logger.debug('Current points before increment:', currentPoints);
    
    const numericPoints = typeof currentPoints === 'number' 
      ? currentPoints 
      : parseInt(String(currentPoints || 0), 10);
    
    // Ensure we only add 1
    const newValue = numericPoints + 1;
    logger.debug('Setting points to:', newValue);
    
    // Use setValue with explicit options to ensure proper form update
    setValue('points', newValue, { 
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    });
  }, [control._formValues.points, setValue, isSaving]);
  
  const handleDecrementDomPoints = useCallback((e: React.MouseEvent) => {
    // Prevent any form submission
    e.preventDefault();
    e.stopPropagation();
    
    // Skip updating if saving is in progress
    if (isSaving) return;
    
    // Get current value and ensure it's a number
    const currentDomPoints = control._formValues.dom_points;
    logger.debug('Current dom points before decrement:', currentDomPoints);
    
    const numericDomPoints = typeof currentDomPoints === 'number' 
      ? currentDomPoints 
      : parseInt(String(currentDomPoints || 0), 10);
    
    // Ensure we only subtract 1 and don't go below 0
    const newValue = Math.max(0, numericDomPoints - 1);
    logger.debug('Setting dom_points to:', newValue);
    
    // Use setValue with explicit options to ensure proper form update
    setValue('dom_points', newValue, { 
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    });
  }, [control._formValues.dom_points, setValue, isSaving]);

  const handleIncrementDomPoints = useCallback((e: React.MouseEvent) => {
    // Prevent any form submission
    e.preventDefault();
    e.stopPropagation();
    
    // Skip updating if saving is in progress
    if (isSaving) return;
    
    // Get current value and ensure it's a number
    const currentDomPoints = control._formValues.dom_points;
    logger.debug('Current dom points before increment:', currentDomPoints);
    
    const numericDomPoints = typeof currentDomPoints === 'number' 
      ? currentDomPoints 
      : parseInt(String(currentDomPoints || 0), 10);
    
    // Ensure we only add 1
    const newValue = numericDomPoints + 1;
    logger.debug('Setting dom_points to:', newValue);
    
    // Use setValue with explicit options to ensure proper form update
    setValue('dom_points', newValue, { 
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    });
  }, [control._formValues.dom_points, setValue, isSaving]);

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
                disabled={isSaving}
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
                disabled={isSaving}
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
                type="button"
                variant="outline" 
                size="icon"
                onClick={handleDecrementPoints}
                className="bg-light-navy hover:bg-navy border-light-navy"
                disabled={isSaving}
              >
                <Minus className="h-4 w-4 text-white" />
              </Button>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  step={1}
                  min={0}
                  className="bg-dark-navy border-light-navy text-white text-center w-20"
                  {...field}
                  disabled={isSaving}
                  value={field.value || 0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (!isNaN(value)) {
                      field.onChange(Math.max(0, value));
                    } else {
                      field.onChange(0);
                    }
                  }}
                />
              </FormControl>
              <Button 
                type="button"
                variant="outline" 
                size="icon"
                onClick={handleIncrementPoints}
                className="bg-light-navy hover:bg-navy border-light-navy"
                disabled={isSaving}
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
                type="button"
                variant="outline" 
                size="icon"
                onClick={handleDecrementDomPoints}
                className="bg-light-navy hover:bg-navy border-light-navy"
                disabled={isSaving}
              >
                <Minus className="h-4 w-4 text-white" />
              </Button>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  step={1}
                  min={0}
                  className="bg-dark-navy border-light-navy text-white text-center w-20"
                  {...field}
                  disabled={isSaving}
                  value={field.value || 0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (!isNaN(value)) {
                      field.onChange(Math.max(0, value));
                    } else {
                      field.onChange(0);
                    }
                  }}
                />
              </FormControl>
              <Button 
                type="button"
                variant="outline" 
                size="icon"
                onClick={handleIncrementDomPoints}
                className="bg-light-navy hover:bg-navy border-light-navy"
                disabled={isSaving}
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
