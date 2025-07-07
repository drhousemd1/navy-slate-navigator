
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Control } from 'react-hook-form';
import { LocalTaskFormValues } from './TaskFormProvider';

interface TaskBasicDetailsProps {
  control: Control<LocalTaskFormValues>;
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
      
      <FormField
        control={control}
        name="is_dom_task"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <FormLabel className="text-white">Dominant Task</FormLabel>
              <p className="text-sm text-white">Switch to dominant task</p>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
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
