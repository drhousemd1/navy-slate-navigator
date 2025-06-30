
import React from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { Task } from '@/lib/taskUtils';
import { useFormStatePersister } from '@/hooks/useFormStatePersister';

export interface TaskFormValues {
  title: string;
  description: string;
  points: number;
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  background_image_url?: string;
  background_opacity: number;
  icon_url?: string;
  icon_name?: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  priority: 'low' | 'medium' | 'high';
  image_meta?: any;
}

interface TaskFormProviderProps {
  taskData?: Partial<Task>;
  formBaseId: string;
  persisterExclude?: string[];
  children: (
    form: UseFormReturn<TaskFormValues>,
    clearPersistedState: () => Promise<void>
  ) => React.ReactNode;
}

const TaskFormProvider: React.FC<TaskFormProviderProps> = ({
  taskData,
  formBaseId,
  persisterExclude = [],
  children
}) => {
  const form = useForm<TaskFormValues>({
    shouldFocusError: false,
    defaultValues: {
      title: taskData?.title || '',
      description: taskData?.description || '',
      points: taskData?.points || 5,
      frequency: (taskData?.frequency as 'daily' | 'weekly') || 'daily',
      frequency_count: taskData?.frequency_count || 1,
      background_image_url: taskData?.background_image_url || undefined,
      background_opacity: taskData?.background_opacity || 100,
      icon_url: taskData?.icon_url || undefined,
      icon_name: taskData?.icon_name || undefined,
      title_color: taskData?.title_color || '#FFFFFF',
      subtext_color: taskData?.subtext_color || '#8E9196',
      calendar_color: taskData?.calendar_color || '#7E69AB',
      icon_color: taskData?.icon_color || '#9b87f5',
      highlight_effect: taskData?.highlight_effect || false,
      focal_point_x: taskData?.focal_point_x || 50,
      focal_point_y: taskData?.focal_point_y || 50,
      priority: taskData?.priority || 'medium',
      image_meta: taskData?.image_meta || undefined,
    },
  });

  const persisterFormId = `${formBaseId}-${taskData?.id || 'new'}`;
  const { clearPersistedState } = useFormStatePersister(persisterFormId, form, {
    exclude: persisterExclude
  });

  return (
    <Form {...form}>
      {children(form, clearPersistedState)}
    </Form>
  );
};

export default TaskFormProvider;
