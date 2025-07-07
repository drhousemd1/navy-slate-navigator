import React from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { useFormStatePersister } from '@/hooks/useFormStatePersister';

export interface SimpleTaskFormValues {
  title: string;
  description: string;
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  points: number;
  priority: 'low' | 'medium' | 'high';
  icon_name?: string;
  icon_color: string;
  icon_url?: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  background_image_url?: string;
  background_images?: any;
  background_opacity: number;
  focal_point_x: number;
  focal_point_y: number;
  highlight_effect: boolean;
  image_meta?: any;
  is_dom_task: boolean;
}

interface TaskFormProviderProps {
  taskData?: any;
  formBaseId: string;
  persisterExclude?: string[];
  children: (
    form: UseFormReturn<SimpleTaskFormValues>,
    clearPersistedState: () => Promise<void>
  ) => React.ReactNode;
}

const TaskFormProvider: React.FC<TaskFormProviderProps> = ({
  taskData,
  formBaseId,
  persisterExclude = [],
  children
}) => {
  const form = useForm<SimpleTaskFormValues>({
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
      is_dom_task: taskData?.is_dom_task || false,
    },
  });

  const persisterFormId = `${formBaseId}-${taskData?.id || 'new'}`;
  const { clearPersistedState: originalClearPersistedState } = useFormStatePersister(persisterFormId, form, {
    exclude: persisterExclude
  });

  const clearPersistedStateForChild = async (): Promise<void> => {
    await originalClearPersistedState();
  };

  return (
    <Form {...form}>
      {children(form, clearPersistedStateForChild)}
    </Form>
  );
};

export default TaskFormProvider;