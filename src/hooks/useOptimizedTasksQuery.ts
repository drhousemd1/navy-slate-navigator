
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Task } from '@/lib/taskUtils';

// Cache keys
const TASKS_KEY = ['tasks'];
const CACHED_TASKS_KEY = 'cached_tasks';

// Types
type TaskVisualData = Pick<Task, 'id' | 'title' | 'description' | 'background_image_url' | 'background_opacity' | 'focal_point_x' | 'focal_point_y'>;

// Get cached tasks from localStorage
const getCachedTasks = (): TaskVisualData[] => {
  try {
    const cached = localStorage.getItem(CACHED_TASKS_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

// Optimized fetch with column selection
const fetchTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      id,
      title,
      description,
      background_image_url,
      background_opacity,
      focal_point_x,
      focal_point_y,
      points,
      completed,
      frequency,
      frequency_count,
      icon_url,
      icon_name,
      priority,
      title_color,
      subtext_color,
      calendar_color,
      highlight_effect,
      icon_color,
      usage_data
    `)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching tasks:', error);
    throw new Error(error.message);
  }

  const tasks = (data || []).map(task => ({
    ...task,
    frequency: task.frequency as "daily" | "weekly",
    usage_data: task.usage_data || Array(7).fill(0)
  }));

  // Cache the visual data
  const visualData = tasks.map(({ id, title, description, background_image_url, background_opacity, focal_point_x, focal_point_y }) => ({
    id,
    title,
    description,
    background_image_url,
    background_opacity,
    focal_point_x,
    focal_point_y
  }));
  localStorage.setItem(CACHED_TASKS_KEY, JSON.stringify(visualData));

  return tasks;
};

export function useOptimizedTasksQuery() {
  const queryClient = useQueryClient();

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
    initialData: () => {
      const cached = getCachedTasks();
      return cached.length ? cached : undefined;
    }
  });

  return {
    tasks,
    isLoading,
    error: error instanceof Error ? error : null,
    refetchTasks
  };
}
