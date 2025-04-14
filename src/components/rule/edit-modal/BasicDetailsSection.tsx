
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PrioritySelector from '@/components/task-editor/PrioritySelector';
import { Control } from 'react-hook-form';

interface BasicDetailsSectionProps {
  control: Control<any>;
}

const BasicDetailsSection: React.FC<BasicDetailsSectionProps> = ({ control }) => {
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
                placeholder="Enter title" 
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
                placeholder="Enter description" 
                className="bg-dark-navy border-light-navy text-white"
                {...field} 
              />
            </FormControl>
          </FormItem>
        )}
      />
      
      <FormField
        control={control}
        name="priority"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Priority</FormLabel>
            <FormControl>
              <PrioritySelector 
                control={control}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
};

export default BasicDetailsSection;
