import { useState, useCallback, useEffect } from 'react';
import { useTasksQuery, TasksQueryResult } from '@/data/tasks/queries'; // Import TasksQueryResult
import { TaskWithId } from '@/data/tasks/types';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { saveTasksToDB } from '@/data/indexedDB/useIndexedDB';
import { useDeleteTask } from '@/data/mutations/tasks/useDeleteTask';
import { TaskPriority } from '@/lib/taskUtils'; 
import { logger } from '@/lib/logger'; // Added logger import

export const useTasksData = () => {
  const { 
    data: tasks = [], 
    isLoading, 
    error, 
    refetch,
    isUsingCachedData
  }: TasksQueryResult = useTasksQuery(); // Destructure from TasksQueryResult
  
  const queryClient = useQueryClient();
  const deleteTaskMutation = useDeleteTask();

  const saveTask = async (taskData: TaskWithId) => {
    try {
      if (taskData.id) {
        // Update existing task
        const { error: updateError } = await supabase // aliased error
          .from("tasks")
          .update({
            title: taskData.title,
            description: taskData.description,
            points: taskData.points,
            frequency: taskData.frequency,
            frequency_count: taskData.frequency_count,
            background_image_url: taskData.background_image_url,
            background_opacity: taskData.background_opacity,
            icon_url: taskData.icon_url,
            icon_name: taskData.icon_name,
            priority: taskData.priority,
            title_color: taskData.title_color,
            subtext_color: taskData.subtext_color,
            calendar_color: taskData.calendar_color,
            icon_color: taskData.icon_color,
            highlight_effect: taskData.highlight_effect,
            focal_point_x: taskData.focal_point_x,
            focal_point_y: taskData.focal_point_y
          })
          .eq("id", taskData.id);

        if (updateError) {
          logger.error("Error updating task:", updateError); // Replaced console.error
          toast({
            title: 'Error',
            description: 'Failed to update task: ' + updateError.message,
            variant: 'destructive',
          });
          throw updateError;
        }

        // Update the local cache optimistically
        queryClient.setQueryData<TaskWithId[]>(["tasks"], (oldTasks) => {
          if (!oldTasks) return [taskData]; // Should be TaskWithId[]
          const updatedTasks = oldTasks.map(t => 
            t.id === taskData.id ? { ...t, ...taskData, completed: t.completed } : t
          );
          saveTasksToDB(updatedTasks); // Update IndexedDB
          return updatedTasks;
        });

        toast({
          title: 'Task Updated',
          description: 'Your task has been updated successfully.',
        });
        return taskData;
      } else {
        // Create new task
        const newTaskData = {
          title: taskData.title,
          description: taskData.description,
          points: taskData.points,
          completed: false,
          frequency: taskData.frequency,
          frequency_count: taskData.frequency_count,
          background_image_url: taskData.background_image_url,
          background_opacity: taskData.background_opacity,
          icon_url: taskData.icon_url,
          icon_name: taskData.icon_name,
          priority: taskData.priority || 'medium' as TaskPriority, // Ensure priority is correctly typed
          title_color: taskData.title_color,
          subtext_color: taskData.subtext_color,
          calendar_color: taskData.calendar_color,
          icon_color: taskData.icon_color,
          highlight_effect: taskData.highlight_effect,
          focal_point_x: taskData.focal_point_x,
          focal_point_y: taskData.focal_point_y,
          usage_data: Array(7).fill(0) // Initialize with zeros for a week
        };

        const { data: newTaskResponse, error: insertError } = await supabase // aliased error
          .from("tasks")
          .insert([newTaskData])
          .select();

        if (insertError) {
          logger.error("Error creating task:", insertError); // Replaced console.error
          toast({
            title: 'Error',
            description: 'Failed to create task: ' + insertError.message,
            variant: 'destructive',
          });
          throw insertError;
        }

        // Update the cache with the new task from the server
        if (newTaskResponse && newTaskResponse[0]) {
          const createdTask = newTaskResponse[0] as TaskWithId; // Cast to TaskWithId
          queryClient.setQueryData<TaskWithId[]>(["tasks"], (oldTasks) => {
            const newTasks = oldTasks ? [createdTask, ...oldTasks] : [createdTask];
            saveTasksToDB(newTasks); // Update IndexedDB
            return newTasks;
          });

          toast({
            title: 'Task Created',
            description: 'Your new task has been created successfully.',
          });
          return createdTask;
        }
      }
      
      await refetch(); // Refresh data to ensure UI is up to date
      return null;
    } catch (err) {
      logger.error("Error in saveTask:", err); // Replaced console.error
      throw err;
    }
  };

  const deleteTask = async (taskId: string) => {
    return deleteTaskMutation.mutateAsync(taskId);
  };

  const toggleTaskCompletion = async (taskId: string, completed: boolean, points: number = 0) => {
    try {
      // Update the local cache optimistically first
      queryClient.setQueryData<TaskWithId[]>(["tasks"], oldTasks => {
        if (!oldTasks) return [];
        const updatedTasks = oldTasks.map(t => 
          t.id === taskId ? { ...t, completed } : t
        );
        saveTasksToDB(updatedTasks); // Update IndexedDB
        return updatedTasks;
      });

      // Then update the database
      const { error: toggleError } = await supabase // aliased error
        .from("tasks")
        .update({ completed })
        .eq("id", taskId);

      if (toggleError) {
        logger.error("Error updating task completion:", toggleError); // Replaced console.error
        
        // Revert the optimistic update
        queryClient.setQueryData<TaskWithId[]>(["tasks"], oldTasks => {
          if (!oldTasks) return [];
          const revertedTasks = oldTasks.map(t => 
            t.id === taskId ? { ...t, completed: !completed } : t
          );
          saveTasksToDB(revertedTasks);
          return revertedTasks;
        });
        
        toast({
          title: 'Error',
          description: 'Failed to update task completion status: ' + toggleError.message,
          variant: 'destructive',
        });
        throw toggleError;
      }

      // If the task was marked as completed, trigger the completion history recording and points update
      if (completed) {
        // This async operation could happen in the background
        try {
          await supabase.rpc('record_task_completion', { 
            task_id_param: taskId,
            user_id_param: (await supabase.auth.getUser()).data.user?.id 
          });
          
          // Get the user's current points
          const { data: profile } = await supabase
            .from('profiles')
            .select('points')
            .eq('id', (await supabase.auth.getUser()).data.user?.id)
            .single();
            
          if (profile) {
            // Update the points
            await supabase
              .from('profiles')
              .update({ points: profile.points + points })
              .eq('id', (await supabase.auth.getUser()).data.user?.id);
          }
          
          toast({
            title: 'Task Completed',
            description: `You earned ${points} points!`,
          });
        } catch (err) {
          logger.error("Error recording task completion or updating points:", err); // Replaced console.error
          // We don't need to revert the UI state here since the task is still marked complete
          // Just inform the user about points issue
          toast({
            title: 'Points Update Issue',
            description: 'Task marked complete, but there was an issue updating your points.',
            variant: 'default',
          });
        }
      }

      return true;
    } catch (err) {
      logger.error("Error in toggleTaskCompletion:", err); // Replaced console.error
      return false;
    }
  };

  return {
    tasks,
    isLoading,
    error,
    isUsingCachedData,
    saveTask,
    deleteTask,
    toggleTaskCompletion,
    refetch // ensure refetch is returned
  };
};
