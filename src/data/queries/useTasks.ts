
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Task, TaskPriority } from "@/lib/taskUtils";
import { useAuth } from "@/contexts/auth";

export default function useTasksQuery() {
  const { user } = useAuth();

  const queryKey = ["tasks", user?.id] as const;

  const queryFn = async (): Promise<Task[]> => {
    const userId = user?.id;
    if (!userId) {
      return [];
    }

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId) // Note: 'user_id' column is not in the provided 'tasks' table schema. This might be an issue for data filtering.
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map(dbTask => ({
      id: dbTask.id,
      title: dbTask.title,
      description: dbTask.description,
      points: dbTask.points,
      priority: dbTask.priority as TaskPriority,
      completed: dbTask.completed,
      background_image_url: dbTask.background_image_url,
      background_opacity: dbTask.background_opacity,
      focal_point_x: dbTask.focal_point_x,
      focal_point_y: dbTask.focal_point_y,
      frequency: dbTask.frequency as 'daily' | 'weekly',
      frequency_count: dbTask.frequency_count,
      usage_data: dbTask.usage_data || [],
      icon_url: dbTask.icon_url, // Assuming icon_url is part of tasks schema if mapped
      icon_name: dbTask.icon_name,
      icon_color: dbTask.icon_color,
      highlight_effect: dbTask.highlight_effect, // Assuming highlight_effect is part of tasks schema
      title_color: dbTask.title_color,
      subtext_color: dbTask.subtext_color,
      calendar_color: dbTask.calendar_color,
      last_completed_date: dbTask.last_completed_date,
      created_at: dbTask.created_at,
      updated_at: dbTask.updated_at,
    })) as Task[];
  };

  return useQuery({ // Removed explicit generic arguments
    queryKey: queryKey,
    queryFn: queryFn,
    enabled: !!user?.id,
    staleTime: Infinity,
  });
}
