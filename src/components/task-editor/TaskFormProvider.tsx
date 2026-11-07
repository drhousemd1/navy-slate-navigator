import React from 'react';
import { useEditorDraftScope } from '@/hooks/useEditorDraftScope';
import { editorDraftKey, type EditorDraftScope } from '@/lib/editorDrafts';
import { EditorDraftNotice } from '@/components/common/EditorDraftNotice';
import { useForm, UseFormReturn } from 'react-hook-form';
import { useFormStatePersister } from '@/hooks/useFormStatePersister';
import { Form } from '@/components/ui/form';

// Local interface to avoid circular type issues
interface LocalTaskFormValues {
  title: string;
  description: string;
  frequency: 'once' | 'daily' | 'weekly';
  frequency_count: number;
  mandatory?: boolean;
  deadline_date?: string | null;
  deadline_time?: string | null;
  deadline_weekday?: number | null;
  points: number;
  priority: 'low' | 'medium' | 'high';
  icon_name?: string | null;
  icon_color: string;
  icon_url?: string | null;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  background_image_url?: string | null;
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
  children: (
    form: UseFormReturn<LocalTaskFormValues>,
    clearPersistedState: () => Promise<boolean>
  ) => React.ReactNode;
}

const TaskFormProvider: React.FC<TaskFormProviderProps> = (props) => {
  const scope = useEditorDraftScope();
  if (!scope) return <p role="status">Checking your draft account…</p>;
  return <TaskFormSession key={editorDraftKey(scope, `${props.formBaseId}-${props.taskData?.id || 'new'}`)} {...props} scope={scope} />;
};

const TaskFormSession: React.FC<TaskFormProviderProps & { scope: EditorDraftScope }> = ({ scope,
  taskData,
  formBaseId,
  children
}) => {
  const form = useForm<LocalTaskFormValues>({
    shouldFocusError: false,
    defaultValues: {
      title: taskData?.title || '',
      description: taskData?.description || '',
      points: taskData?.points ?? 5,
      frequency: (taskData?.frequency as 'once' | 'daily' | 'weekly') || 'daily',
      frequency_count: taskData?.frequency_count || 1,
      mandatory: taskData?.mandatory ?? false,
      deadline_date: taskData?.deadline_date ?? null,
      deadline_time: taskData?.deadline_time?.slice(0, 5) ?? null,
      deadline_weekday: taskData?.deadline_weekday ?? null,
      background_image_url: taskData?.background_image_url || undefined,
      background_opacity: taskData?.background_opacity ?? 100,
      icon_url: taskData?.icon_url || undefined,
      icon_name: taskData?.icon_name || undefined,
      title_color: taskData?.title_color || '#FFFFFF',
      subtext_color: taskData?.subtext_color || '#8E9196',
      calendar_color: taskData?.calendar_color || '#7E69AB',
      icon_color: taskData?.icon_color || '#9b87f5',
      highlight_effect: taskData?.highlight_effect || false,
      focal_point_x: taskData?.focal_point_x ?? 50,
      focal_point_y: taskData?.focal_point_y ?? 50,
      priority: taskData?.priority || 'medium',
      background_images: taskData?.background_images ?? null,
      image_meta: taskData?.image_meta || undefined,
      is_dom_task: taskData?.is_dom_task || false,
    },
  });

  const draft = useFormStatePersister<LocalTaskFormValues>(`${formBaseId}-${taskData?.id || 'new'}`, form, { scope });
  if (!draft.ready) return <p role="status">Loading your draft…</p>;
  return (
    <Form {...form}>
      <EditorDraftNotice draft={draft} />
      {children(form, draft.clearPersistedState)}
    </Form>
  );
};

export default TaskFormProvider;
export type { LocalTaskFormValues };