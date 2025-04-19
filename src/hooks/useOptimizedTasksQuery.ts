
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/lib/taskUtils';

// Cache keys
const TASKS_KEY = ['tasks'];
const CACHED_TASKS_KEY = 'cached_tasks';

// Types
export type TaskVisualData = {
  id: string;
  title: string;
  description: string;
  background_image_url?: string;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  points: number;
  priority: 'low' | 'medium' | 'high';
  completed?: boolean;
  frequency?: 'daily' | 'weekly';
  frequency_count?: number;
  icon_url?: string;
  icon_name?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  icon_color?: string;
};

const getCachedTasks = (): Task[] => {
  try {
    const cached = localStorage.getItem(CACHED_TASKS_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

const fetchTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching tasks:', error);
    throw new Error(error.message);
  }

  // Process and validate the data
  const tasks = (data || []).map(task => ({
    ...task,
    frequency: task.frequency || 'daily',
    priority: task.priority || 'medium',
    points: Number(task.points) || 0,
    background_opacity: Number(task.background_opacity) || 100,
    focal_point_x: Number(task.focal_point_x) || 50,
    focal_point_y: Number(task.focal_point_y) || 50,
    usage_data: task.usage_data || Array(7).fill(0)
  })) as Task[];

  // Cache the tasks
  localStorage.setItem(CACHED_TASKS_KEY, JSON.stringify(tasks));
  return tasks;
};

export function useOptimizedTasksQuery() {
  const {
    data: tasks = [],
    isLoading,
    error,
    refetch: refetchTasks
  } = useQuery({
    queryKey: TASKS_KEY,
    queryFn: fetchTasks,
    staleTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    initialData: getCachedTasks
  });

  return {
    tasks,
    isLoading,
    error: error instanceof Error ? error : null,
    refetchTasks
  };
}
