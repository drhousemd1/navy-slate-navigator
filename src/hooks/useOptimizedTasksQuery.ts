
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
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
  priority?: 'low' | 'medium' | 'high';
};

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

  // Ensure all data conforms to expected types
  const tasks = (data || []).map(task => ({
    ...task,
    frequency: (task.frequency === 'daily' || task.frequency === 'weekly') ? task.frequency : 'daily',
    priority: (task.priority === 'low' || task.priority === 'medium' || task.priority === 'high') ? task.priority : 'medium',
    usage_data: task.usage_data || Array(7).fill(0)
  })) as Task[];

  // Cache the visual data
  const visualData = tasks.map(({ id, title, description, background_image_url, background_opacity, focal_point_x, focal_point_y, points, priority }) => ({
    id,
    title,
    description,
    background_image_url,
    background_opacity,
    focal_point_x,
    focal_point_y,
    points,
    priority
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
      return cached.length ? cached as Task[] : undefined;
    }
  });

  return {
    tasks,
    isLoading,
    error: error instanceof Error ? error : null,
    refetchTasks
  };
}
