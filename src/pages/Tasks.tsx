
import React, { useState } from 'react';
import TaskEditor from '@/components/TaskEditor';
import TasksList from '@/components/task/TasksList';
import { useTasksData } from '@/hooks/useTasksData';
import { TaskWithId, TaskFormValues, CreateTaskVariables } from '@/data/tasks/types';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { TasksHeader } from '@/components/task/TasksHeader';
import { useAuth } from '@/contexts/auth';

const Tasks: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithId | null>(null);
  const { user } = useAuth();
  
  const {
    tasks,
    isLoading,
    error,
    isUsingCachedData,
    saveTask,
    deleteTask
  } = useTasksData();

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

      let payload: CreateTaskVariables | TaskWithId;
      
      if (editingTask?.id) {
        // Updating existing task
        payload = {
          ...editingTask,
          ...taskData,
          user_id: user.id,
          usage_data: editingTask.usage_data || Array(7).fill(0),
        } as TaskWithId;
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
      await saveTask({
        ...task,
        completed,
        last_completed_date: completed ? new Date().toISOString() : undefined,
      });
      
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
