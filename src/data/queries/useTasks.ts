
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { Task } from "@/lib/taskUtils";
import { loadTasksFromDB, saveTasksToDB } from "../indexedDB/useIndexedDB";

// Fetch tasks from Supabase
const fetchTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    throw error;
  }
  
  // Transform data to ensure it matches the Task interface type
  const transformedTasks: Task[] = (data || []).map(task => ({
    id: task.id,
    title: task.title,
    description: task.description || "",
    points: task.points,
    priority: (task.priority as "low" | "medium" | "high") || "medium",
    completed: task.completed,
    background_image_url: task.background_image_url,
    background_opacity: task.background_opacity,
    focal_point_x: task.focal_point_x,
    focal_point_y: task.focal_point_y,
    frequency: task.frequency as "daily" | "weekly",
    frequency_count: task.frequency_count,
    // Explicitly convert usage_data to ensure it's a number array
    usage_data: Array.isArray(task.usage_data) 
      ? task.usage_data.map((val: any) => Number(val)) 
      : [0, 0, 0, 0, 0, 0, 0],
    icon_name: task.icon_name,
    icon_url: task.icon_url,
    icon_color: task.icon_color,
    highlight_effect: task.highlight_effect,
    title_color: task.title_color,
    subtext_color: task.subtext_color,
    calendar_color: task.calendar_color,
    last_completed_date: task.last_completed_date,
    created_at: task.created_at,
    updated_at: task.updated_at
  }));
  
  // Save to IndexedDB for offline access
  await saveTasksToDB(transformedTasks);
  
  return transformedTasks;
};

// Hook for accessing tasks
export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    initialData: [], 
    staleTime: Infinity,
    placeholderData: () => {
      // Return empty array as placeholder until the real data loads
      return [];
    },
    // Use this option to control how long to keep data in cache
    gcTime: 5 * 60 * 1000 // 5 minutes
  });
}
