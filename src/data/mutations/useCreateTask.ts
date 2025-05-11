
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/lib/taskUtils';
import { toast } from '@/hooks/use-toast';
import { saveTasksToDB } from '@/data/indexedDB/useIndexedDB';
import { syncCardById } from '@/data/sync/useSyncManager';

// Default task template
const DEFAULT_TASK: Task = {
  id: '',
  title: 'New Task',
  description: '',
  points: 5,
  priority: 'medium',
  frequency: 'daily',
  frequency_count: 1,
  completed: false,
  icon_name: 'CheckCircle2',
  icon_color: '#9b87f5',
  title_color: '#FFFFFF',
  subtext_color: '#8E9196',
  calendar_color: '#7E69AB',
  background_opacity: 100,
  focal_point_x: 50,
  focal_point_y: 50,
  highlight_effect: false,
  usage_data: [0, 0, 0, 0, 0, 0, 0] 
};

export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (taskData?: Partial<Task>): Promise<Task> => {
      // Generate a new task with defaults and any provided overrides
      const newTask: Task = {
        ...DEFAULT_TASK,
        id: uuidv4(),
        ...taskData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Save to Supabase
      const { data, error } = await supabase
        .from('tasks')
        .insert(newTask)
        .select()
        .single();
        
      if (error) {
        console.error('Error creating task:', error);
        toast({
          title: 'Error',
          description: 'Failed to create task',
          variant: 'destructive'
        });
        throw error;
      }
      
      return data as Task;
    },
    onSuccess: (newTask) => {
      // Update cache
      queryClient.setQueryData(['tasks'], (oldTasks: Task[] = []) => {
        const updatedTasks = [...oldTasks, newTask];
        
        // Update IndexedDB
        saveTasksToDB(updatedTasks);
        
        return updatedTasks;
      });
      
      // Sync the individual card
      syncCardById(newTask.id, 'tasks');
      
      toast({
        title: 'Success',
        description: 'Task created successfully'
      });
    },
    onError: (error) => {
      console.error('Error in useCreateTask:', error);
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive'
      });
    }
  });
}
