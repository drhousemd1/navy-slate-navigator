import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import TaskEditor from '../components/TaskEditor';
import TasksHeader from '../components/task/TasksHeader';
import TasksList from '../components/task/TasksList';
import { RewardsProvider, useRewards } from '@/contexts/RewardsContext';
import { TasksProvider, useTasks } from '../contexts/TasksContext';
import { Task } from '@/lib/taskUtils';
import { syncCardById } from '@/data/sync/useSyncManager';
import { useSyncManager } from '@/hooks/useSyncManager';
import { usePreloadTasks } from "@/data/preload/usePreloadTasks";
import { toast } from "@/hooks/use-toast";

// Preload tasks data from IndexedDB before component renders
usePreloadTasks()();

// Separate component that uses useTasks hook inside TasksProvider
const TasksWithContext: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const { tasks, isLoading, saveTask, deleteTask, toggleTaskCompletion, refetchTasks } = useTasks();
  const { refreshPointsFromDatabase } = useRewards();
  
  // Use the sync manager to keep data in sync
  const { syncNow, isOnline } = useSyncManager({ 
    intervalMs: 30000,
    enabled: true,
    maxRetries: 3
  });
  
  // Initial sync when component mounts
  useEffect(() => {
    try {
      syncNow(); // Force a sync when the Tasks page is loaded
    } catch (error) {
      console.error("Failed to sync data:", error);
      // Continue with local data if sync fails
    }
  }, [syncNow]);

  const handleAddTask = () => {
    console.log('handleAddTask called in TasksWithContext');
    setCurrentTask(null);
    setIsEditorOpen(true);
  };

  // Expose the handleAddTask function to be called from outside
  React.useEffect(() => {
    console.log('Setting up event listener for add-new-task');
    const element = document.querySelector('.TasksContent');
    if (element) {
      const handleAddEvent = () => {
        console.log('Received add-new-task event');
        handleAddTask();
      };
      element.addEventListener('add-new-task', handleAddEvent);
      return () => {
        element.removeEventListener('add-new-task', handleAddEvent);
      };
    }
  }, []);

  const handleEditTask = (task: Task) => {
    setCurrentTask(task);
    setIsEditorOpen(true);
  };

  const handleSaveTask = async (taskData: Task) => {
    try {
      await saveTask(taskData);
      setIsEditorOpen(false);
      setCurrentTask(null);
      
      // Synchronize data after task save, but don't fail if sync fails
      try {
        setTimeout(() => syncCardById(taskData.id, 'tasks'), 500);
      } catch (syncError) {
        console.error('Error syncing task:', syncError);
        // Continue with local operation even if sync fails
      }
    } catch (err) {
      console.error('Error saving task:', err);
      toast({
        title: "Saving Failed",
        description: "Task saved locally. Will sync when connection is restored.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setCurrentTask(null);
      setIsEditorOpen(false);
    } catch (err) {
      console.error('Error deleting task:', err);
      toast({
        title: "Operation Failed",
        description: "Could not delete task. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleToggleCompletion = async (taskId: string, completed: boolean) => {
    try {
      await toggleTaskCompletion(taskId, completed);
      // Always refresh points after task completion
      if (completed) {
        setTimeout(() => {
          try {
            refreshPointsFromDatabase();
          } catch (pointsErr) {
            console.error('Error refreshing points:', pointsErr);
            // Continue if points refresh fails
          }
        }, 300);
      }
    } catch (err) {
      console.error('Error toggling task completion:', err);
      toast({
        title: "Connection Issue",
        description: "Task completion saved locally. Points will update when connection is restored.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Refresh points when component mounts
    try {
      refreshPointsFromDatabase();
    } catch (error) {
      console.error("Failed to refresh points:", error);
      // Continue without failing if points refresh fails
    }
  }, [refreshPointsFromDatabase]);

  // Show offline indicator if needed
  useEffect(() => {
    if (!isOnline) {
      toast({
        title: "You're Offline",
        description: "Working with local data. Changes will sync when connection is restored.",
        duration: 5000,
      });
    }
  }, [isOnline]);

  return (
    <div className="p-4 pt-6 TasksContent">
      {!isOnline && (
        <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-md mb-4 text-sm flex items-center">
          <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
          Offline Mode - Using locally saved data
        </div>
      )}

      <TasksHeader />

      <TasksList
        tasks={tasks}
        isLoading={isLoading}
        onEditTask={handleEditTask}
        onToggleCompletion={handleToggleCompletion}
      />

      <TaskEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setCurrentTask(null);
        }}
        taskData={currentTask || undefined}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />
    </div>
  );
};

// Main Tasks component that sets up the providers
const Tasks: React.FC = () => {
  const contentRef = useRef<{ handleAddNewTask?: () => void }>({});
  
  const handleAddNewItem = () => {
    console.log('AppLayout onAddNewItem called for Tasks');
    const content = document.querySelector('.TasksContent');
    if (content) {
      console.log('Dispatching add-new-task event');
      const event = new CustomEvent('add-new-task');
      content.dispatchEvent(event);
    }
  };

  return (
    <AppLayout onAddNewItem={handleAddNewItem}>
      <RewardsProvider>
        <TasksProvider>
          <TasksWithContext />
        </TasksProvider>
      </RewardsProvider>
    </AppLayout>
  );
};

export default Tasks;
