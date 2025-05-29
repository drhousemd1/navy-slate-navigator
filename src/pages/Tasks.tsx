
import React, { useState, useEffect } from 'react';
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

const Tasks: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithId | null>(null);
  const { user } = useAuth();
  const { subUserId, domUserId, isLoadingUserIds } = useUserIds();
  
  const {
    tasks,
    isLoading,
    error,
    isUsingCachedData,
    saveTask,
    deleteTask
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
        toast({
          title: "Authentication Error",
          description: "You must be logged in to save tasks.",
          variant: "destructive",
        });
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
      
      toast({
        title: "Success",
        description: editingTask ? "Task updated successfully!" : "Task created successfully!",
        variant: "default",
      });
    } catch (error: unknown) {
      const descriptiveMessage = getErrorMessage(error);
      logger.error("Error saving task:", descriptiveMessage, error);
      toast({
        title: "Save Error",
        description: descriptiveMessage,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setIsEditorOpen(false);
      setEditingTask(null);
      
      toast({
        title: "Success",
        description: "Task deleted successfully!",
        variant: "default",
      });
    } catch (error: unknown) {
      const descriptiveMessage = getErrorMessage(error);
      logger.error("Error deleting task:", descriptiveMessage, error);
      toast({
        title: "Delete Error", 
        description: descriptiveMessage,
        variant: "destructive",
      });
    }
  };

  const handleToggleTaskCompletion = async (taskId: string, completed: boolean) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      const updatePayload: UpdateTaskVariables = {
        ...task,
        id: taskId,
        completed,
        last_completed_date: completed ? new Date().toISOString() : undefined,
      };
      
      await saveTask(updatePayload);
      
      toast({
        title: completed ? "Task Completed!" : "Task Marked Incomplete",
        description: completed ? `You earned ${task.points} points!` : "Task status updated.",
        variant: "default",
      });
    } catch (error: unknown) {
      const descriptiveMessage = getErrorMessage(error);
      logger.error("Error toggling task completion:", descriptiveMessage, error);
      toast({
        title: "Update Error",
        description: descriptiveMessage,
        variant: "destructive",
      });
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
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-center py-10">
          <p className="text-muted-foreground">Loading user session...</p>
        </div>
      </div>
    );
  }

  // Show authentication requirement if no user
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-center py-10">
          <p className="text-muted-foreground">Please log in to view your tasks.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
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
  );
};

export default Tasks;
