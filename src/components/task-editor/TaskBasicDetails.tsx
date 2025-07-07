
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Control } from 'react-hook-form';
import { SimpleTaskFormValues } from './TaskFormProvider';

interface TaskBasicDetailsProps {
  control: Control<SimpleTaskFormValues>;
  isSaving?: boolean;
}

const TaskBasicDetails: React.FC<TaskBasicDetailsProps> = ({ 
  control, 
  isSaving = false 
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
              <Input 
                placeholder="Task title" 
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
                placeholder="Task description" 
                className="bg-dark-navy border-light-navy text-white min-h-[100px]" 
                {...field}
                disabled={isSaving}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
};

export default TaskBasicDetails;
