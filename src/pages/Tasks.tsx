import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import TaskEditor from '../components/TaskEditor';
import TasksHeader from '../components/task/TasksHeader';
import TasksList from '../components/task/TasksList';
import { RewardsProvider, useRewards } from '@/contexts/RewardsContext';
import { TasksProvider, useTasks } from '../contexts/TasksContext';
import { Task } from '@/lib/taskUtils';
// Assuming syncCardById might be part of useSyncManager or a separate utility.
// For now, if it's only used in the timeout, removing the timeout removes its call here.
// import { syncCardById } from '@/data/sync/useSyncManager'; // This import might not be needed anymore if not used elsewhere
import { useSyncManager } from '@/hooks/useSyncManager'; // This path is read-only.
                                                        // The file Tasks.tsx provided in context uses useSyncManager from @/hooks/useSyncManager
                                                        // This is problematic as that file is read-only.
                                                        // However, the syncCardById import was from '@/data/sync/useSyncManager'.
                                                        // This suggests a mix-up or multiple sync managers.
                                                        // Let's proceed by removing the line that calls syncCardById.
                                                        // The useSyncManager from @/hooks/useSyncManager in Tasks.tsx is for the general syncNow.

import { usePreloadTasks } from "@/data/preload/usePreloadTasks";
import ErrorBoundary from '@/components/ErrorBoundary';

// Preload tasks data from IndexedDB before component renders
usePreloadTasks()();

// Separate component that uses useTasks hook inside TasksProvider
const TasksWithContext: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const { tasks, isLoading, saveTask, deleteTask, toggleTaskCompletion, refetchTasks } = useTasks();
  const { refreshPointsFromDatabase } = useRewards();
  
  const { syncNow } = useSyncManager({ 
    intervalMs: 30000,
    enabled: true 
  });
  
  useEffect(() => {
    syncNow(); 
  }, [syncNow]); 

  const handleAddTask = () => {
    console.log('handleAddTask called in TasksWithContext');
    setCurrentTask(null);
    setIsEditorOpen(true);
  };

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
      
      // Removed:
      // if (taskData.id) {
      //   setTimeout(() => syncCardById(taskData.id, 'tasks'), 500);
      // }
      // Optimistic update from saveTask should handle UI.
      // Periodic sync for eventual consistency.
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
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.error(`Task with id ${taskId} not found.`);
        return;
      }
      await toggleTaskCompletion(taskId, completed, task.points);
      if (completed) {
        setTimeout(() => {
          refreshPointsFromDatabase();
        }, 300);
      }
    } catch (err) {
      console.error('Error toggling task completion:', err);
    }
  };

  useEffect(() => {
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
          <ErrorBoundary fallbackMessage="Could not load tasks. Please try reloading.">
            <TasksWithContext />
          </ErrorBoundary>
        </TasksProvider>
      </RewardsProvider>
    </AppLayout>
  );
};

export default Tasks;
