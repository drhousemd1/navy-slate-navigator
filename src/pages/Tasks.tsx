
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

// Preload tasks data from IndexedDB before component renders
usePreloadTasks()();

// Separate component that uses useTasks hook inside TasksProvider
const TasksWithContext: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const { tasks, isLoading, saveTask, deleteTask, toggleTaskCompletion, refetchTasks } = useTasks();
  const { refreshPointsFromDatabase } = useRewards();
  
  // Use the sync manager to keep data in sync
  const { syncNow } = useSyncManager({ 
    intervalMs: 30000,
    enabled: true 
  });
  
  // Initial sync when component mounts
  useEffect(() => {
    console.log('Tasks page mounted, forcing sync');
    syncNow(); // Force a sync when the Tasks page is loaded
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
      const savedTask = await saveTask(taskData);
      setIsEditorOpen(false);
      setCurrentTask(null);
      
      if (savedTask?.id) {
        // Synchronize data after task save
        console.log('Task saved, syncing:', savedTask.id);
        setTimeout(() => syncCardById(savedTask.id, 'tasks'), 500);
      }
    } catch (err) {
      console.error('Error saving task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setCurrentTask(null);
      setIsEditorOpen(false);
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleToggleCompletion = async (taskId: string, completed: boolean) => {
    try {
      console.log(`Tasks page: handleToggleCompletion called for task ${taskId}, setting to ${completed}`);
      const result = await toggleTaskCompletion(taskId, completed);
      console.log(`Toggle completion result:`, result);
      
      // Always refresh points after task completion
      if (completed) {
        setTimeout(() => {
          console.log('Refreshing points after task completion');
          refreshPointsFromDatabase();
        }, 300);
      }
    } catch (err) {
      console.error('Error toggling task completion:', err);
    }
  };

  useEffect(() => {
    // Refresh points when component mounts
    refreshPointsFromDatabase();
  }, [refreshPointsFromDatabase]);

  return (
    <div className="p-4 pt-6 TasksContent">
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
