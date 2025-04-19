
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

const getCachedTasks = (): TaskVisualData[] => {
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
    frequency: task.frequency === 'weekly' ? 'weekly' : 'daily',
    priority: (task.priority === 'low' || task.priority === 'medium' || task.priority === 'high') 
      ? task.priority 
      : 'medium' as const,
    usage_data: task.usage_data || Array(7).fill(0)
  })) as Task[];

  // Cache the complete visual data
  const visualData = tasks.map(({ 
    id, title, description, background_image_url, background_opacity,
    focal_point_x, focal_point_y, points, priority, completed,
    frequency, frequency_count, icon_url, icon_name,
    title_color, subtext_color, calendar_color, icon_color
  }) => ({
    id,
    title,
    description,
    background_image_url,
    background_opacity,
    focal_point_x,
    focal_point_y,
    points,
    priority,
    completed,
    frequency,
    frequency_count,
    icon_url,
    icon_name,
    title_color,
    subtext_color,
    calendar_color,
    icon_color
  }));
  
  localStorage.setItem(CACHED_TASKS_KEY, JSON.stringify(visualData));
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
