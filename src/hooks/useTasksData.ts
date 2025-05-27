import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TaskWithId, RawSupabaseTask, CreateTaskVariables, UpdateTaskVariables, TaskFormValues } from '@/data/tasks/types';
import { parseTaskData, getWeekIdentifier, DEFAULT_TASK_VALUES } from '@/lib/taskUtils';
import { useCreateTask } from '@/data/tasks/mutations/useCreateTask';
import { useUpdateTask } from '@/data/tasks/mutations/useUpdateTask';
import { useDeleteTask as useDeleteTaskMutation } from '@/data/tasks/mutations/useDeleteTask'; // Renamed import
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { toast } from './use-toast';

export const TASKS_QUERY_KEY = ['tasks'];

async function fetchTasks(): Promise<TaskWithId[]> {
  try {
    const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data?.map(parseTaskData) || [];
  } catch (error) {
    logger.error('Error fetching tasks:', getErrorMessage(error));
    // Do not toast here, let useQuery handle error state
    throw error; // Re-throw for react-query to handle
  }
}

export function useTasksData() {
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading, error, refetch } = useQuery<TaskWithId[], Error>({
    queryKey: TASKS_QUERY_KEY,
    queryFn: fetchTasks,
  });

  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTaskMutation();

  const saveTask = async (taskData: TaskFormValues | (TaskFormValues & { id: string })) => {
    // Determine if it's an update or create
    if ('id' in taskData && taskData.id) {
      // This is an update
      const updateData: UpdateTaskVariables = { id: taskData.id, ...taskData };
      // Remove id from taskData if it's not part of TaskFormValues for update payload
      const { id, ...restOfTaskData } = taskData;
      const payload: UpdateTaskVariables = { id, ...restOfTaskData };
      await updateTaskMutation.mutateAsync(payload);
    } else {
      // This is a create
      const taskToCreate: CreateTaskVariables = {
        ...DEFAULT_TASK_VALUES, // Apply defaults first
        ...taskData, // Then user-provided data
        // Ensure required fields for creation that are not in TaskFormValues are added
        usage_data: Array(7).fill(0), // Default usage_data for new tasks
        background_images: null, // Default
        week_identifier: getWeekIdentifier(new Date()), // Set current week identifier
        // Ensure all non-nullable fields in 'tasks' table have a value
        title: taskData.title || 'Untitled Task',
        points: taskData.points || 0,
        priority: taskData.priority || 'medium',
        frequency: taskData.frequency || 'daily',
        frequency_count: taskData.frequency_count || 1,
        icon_color: taskData.icon_color || DEFAULT_TASK_VALUES.icon_color!,
        title_color: taskData.title_color || DEFAULT_TASK_VALUES.title_color!,
        subtext_color: taskData.subtext_color || DEFAULT_TASK_VALUES.subtext_color!,
        calendar_color: taskData.calendar_color || DEFAULT_TASK_VALUES.calendar_color!,
        background_opacity: taskData.background_opacity ?? DEFAULT_TASK_VALUES.background_opacity!,
        highlight_effect: taskData.highlight_effect ?? DEFAULT_TASK_VALUES.highlight_effect!,
        focal_point_x: taskData.focal_point_x ?? DEFAULT_TASK_VALUES.focal_point_x!,
        focal_point_y: taskData.focal_point_y ?? DEFAULT_TASK_VALUES.focal_point_y!,
      };
      await createTaskMutation.mutateAsync(taskToCreate);
    }
  };

  const deleteTask = async (taskId: string) => {
    await deleteTaskMutation.mutateAsync(taskId);
  };

  return {
    tasks,
    isLoading,
    error,
    refetchTasks: refetch,
    saveTask,
    deleteTask,
  };
}
