import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import TaskEditor from '@/components/TaskEditor';
import TasksList from '@/components/task/TasksList';
import { useTasksData } from '@/hooks/useTasksData';
import { TaskWithId, TaskFormValues, CreateTaskVariables, UpdateTaskVariables } from '@/data/tasks/types';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import TasksHeader from '@/components/task/TasksHeader';
import { useAuth } from '@/contexts/auth';
import { useUserIds } from '@/contexts/UserIdsContext';
import { toastManager } from '@/lib/toastManager';
import { useToggleTaskCompletionMutation } from '@/data/tasks/mutations/useToggleTaskCompletionMutation';

const Tasks: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithId | null>(null);
  const { user } = useAuth();
  const { subUserId, domUserId, isLoadingUserIds } = useUserIds();
  const toggleTaskCompletionMutation = useToggleTaskCompletionMutation();
  
  const {
    tasks,
    isLoading,
    error,
    isUsingCachedData,
    saveTask,
    deleteTask,
    checkAndReloadTasks,
    refetch: refetchTasks
  } = useTasksData();

  // Debug logging for development
  useEffect(() => {
    logger.debug('[Tasks] Component state:', {
      user: user?.id,
      subUserId,
      domUserId,
      isLoadingUserIds,
      tasksCount: tasks?.length || 0,
      isLoading,
      error: error?.message
    });
  }, [user, subUserId, domUserId, isLoadingUserIds, tasks, isLoading, error]);

  // Check for task resets on page load when user is available
  useEffect(() => {
    if (user) {
      checkAndReloadTasks();
    }
  }, [user, checkAndReloadTasks]);

  const handleCreateTask = () => {
    setEditingTask(null);
    setIsEditorOpen(true);
  };

  const handleEditTask = (task: TaskWithId) => {
    setEditingTask(task);
    setIsEditorOpen(true);
  };

  const handleSaveTask = async (taskData: TaskFormValues) => {
    try {
      if (!user?.id) {
        toastManager.error("Authentication Error", "You must be logged in to save tasks.");
        return;
      }

      let payload: CreateTaskVariables | UpdateTaskVariables;
      
      if (editingTask?.id) {
        // Updating existing task
        payload = {
          ...taskData,
          id: editingTask.id,
          user_id: user.id,
          usage_data: editingTask.usage_data || Array(7).fill(0),
        } as UpdateTaskVariables;
      } else {
        // Creating new task
        payload = {
          ...taskData,
          user_id: user.id,
        } as CreateTaskVariables;
      }

      await saveTask(payload);
      setIsEditorOpen(false);
      setEditingTask(null);
      
    } catch (error: unknown) {
      const descriptiveMessage = getErrorMessage(error);
      logger.error("Error saving task:", descriptiveMessage, error);
      toastManager.error("Save Error", descriptiveMessage);
    }
  };

  const handleDeleteTask = async (taskId: string): Promise<void> => {
    try {
      await deleteTask(taskId);
      // Force immediate UI update by refetching
      await refetchTasks();
      setIsEditorOpen(false);
      setEditingTask(null);
      
    } catch (error: unknown) {
      const descriptiveMessage = getErrorMessage(error);
      logger.error("Error deleting task:", descriptiveMessage, error);
      toastManager.error("Delete Error", descriptiveMessage);
      throw error; // Re-throw so the form can handle the error
    }
  };

  const handleToggleTaskCompletion = async (taskId: string, completed: boolean) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      await toggleTaskCompletionMutation.mutateAsync({
        taskId,
        completed,
        pointsValue: task.points,
        task
      });
    } catch (error: unknown) {
      const descriptiveMessage = getErrorMessage(error);
      logger.error("Error toggling task completion:", descriptiveMessage, error);
    }
  };

  const convertTaskToPartial = (task: TaskWithId) => {
    const { id, created_at, updated_at, user_id, ...taskFormData } = task;
    return {
      ...taskFormData,
      id,
      priority: task.priority as 'low' | 'medium' | 'high'
    };
  };

  // Show loading state while user IDs are being resolved
  if (isLoadingUserIds) {
    return (
      <div className="p-4 pt-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-10">
          <p className="text-muted-foreground">Loading user session...</p>
        </div>
      </div>
    );
  }

  // Show authentication requirement if no user
  if (!user) {
    return (
      <div className="p-4 pt-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-10">
          <p className="text-muted-foreground">Please log in to view your tasks.</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout onAddNewItem={handleCreateTask}>
      <div className="p-4 pt-6 max-w-4xl mx-auto">
        <TasksHeader onCreateTask={handleCreateTask} />
        
        <TasksList
          tasks={tasks}
          isLoading={isLoading}
          error={error}
          isUsingCachedData={isUsingCachedData}
          onEditTask={handleEditTask}
          onToggleCompletion={handleToggleTaskCompletion}
        />

        <TaskEditor
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingTask(null);
          }}
          taskData={editingTask ? convertTaskToPartial(editingTask) : undefined}
          onSave={handleSaveTask}
          onDelete={editingTask ? () => handleDeleteTask(editingTask.id) : undefined}
        />
      </div>
    </AppLayout>
  );
};

export default Tasks;
