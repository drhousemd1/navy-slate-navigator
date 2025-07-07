import React from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { Form } from '@/components/ui/form';

// Local interface to avoid circular type issues
interface LocalTaskFormValues {
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
    form: UseFormReturn<LocalTaskFormValues>,
    clearPersistedState: () => Promise<void>
  ) => React.ReactNode;
}

const TaskFormProvider: React.FC<TaskFormProviderProps> = ({
  taskData,
  formBaseId,
  persisterExclude = [],
  children
}) => {
  const form = useForm<LocalTaskFormValues>({
    shouldFocusError: false,
  });

  const clearPersistedStateForChild = async (): Promise<void> => {
    // Simplified - will add back useFormStatePersister once types are stable
  };

  return (
    <Form {...form}>
      {children(form, clearPersistedStateForChild)}
    </Form>
  );
};

export default TaskFormProvider;
export type { LocalTaskFormValues };