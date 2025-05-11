
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useMutation } from "@tanstack/react-query";
import { queryClient } from "../queryClient";
import { supabase } from '@/integrations/supabase/client';
import { Task } from "@/lib/taskUtils";
import { saveTasksToDB } from "../indexeddb/useIndexedDB";

// Create or update a task
const createOrUpdateTask = async (taskData: Partial<Task>): Promise<Task> => {
  if (taskData.id) {
    // Update existing task
    const { data, error } = await supabase
      .from('tasks')
      .update({
        title: taskData.title,
        description: taskData.description,
        points: taskData.points,
        priority: taskData.priority,
        frequency: taskData.frequency,
        frequency_count: taskData.frequency_count,
        background_image_url: taskData.background_image_url,
        background_opacity: taskData.background_opacity,
        icon_name: taskData.icon_name,
        icon_color: taskData.icon_color,
        title_color: taskData.title_color,
        subtext_color: taskData.subtext_color,
        calendar_color: taskData.calendar_color,
        highlight_effect: taskData.highlight_effect,
        focal_point_x: taskData.focal_point_x,
        focal_point_y: taskData.focal_point_y,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskData.id)
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  } else {
    // Create new task
    const newTask = {
      title: taskData.title || 'New Task',
      description: taskData.description,
      points: taskData.points || 0,
      priority: taskData.priority || 'medium',
      frequency: taskData.frequency || 'daily',
      frequency_count: taskData.frequency_count || 1,
      completed: false,
      background_image_url: taskData.background_image_url,
      background_opacity: taskData.background_opacity || 100,
      icon_name: taskData.icon_name,
      icon_color: taskData.icon_color || '#9b87f5',
      title_color: taskData.title_color || '#FFFFFF',
      subtext_color: taskData.subtext_color || '#8E9196',
      calendar_color: taskData.calendar_color || '#7E69AB',
      highlight_effect: taskData.highlight_effect || false,
      focal_point_x: taskData.focal_point_x || 50,
      focal_point_y: taskData.focal_point_y || 50,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(newTask)
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  }
};

// Hook for creating or updating tasks
export function useCreateTask() {
  return useMutation({
    mutationFn: createOrUpdateTask,
    onSuccess: (newTask) => {
      // Update tasks in cache
      queryClient.setQueryData(['tasks'], (oldTasks: Task[] = []) => {
        let updatedTasks: Task[];
        
        if (oldTasks.some(task => task.id === newTask.id)) {
          // Update existing task
          updatedTasks = oldTasks.map(task => 
            task.id === newTask.id ? newTask : task
          );
        } else {
          // Add new task
          updatedTasks = [newTask, ...oldTasks];
        }
        
        // Update IndexedDB
        saveTasksToDB(updatedTasks);
        
        return updatedTasks;
      });
    }
  });
}
