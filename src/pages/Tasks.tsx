import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import TaskEditor from '../components/TaskEditor';
import TasksHeader from '../components/task/TasksHeader';
import TasksList from '../components/task/TasksList';
import { RewardsProvider, useRewards } from '@/contexts/RewardsContext';
import { TasksProvider, useTasks } from '../contexts/TasksContext';
import { Task } from '@/lib/taskUtils';
import { useSyncManager } from '@/hooks/useSyncManager';
import ErrorBoundary from '@/components/ErrorBoundary';

// Preload tasks data (existing) - REMOVE THIS LINE
// usePreloadTasks()();

// Separate component that uses useTasks hook inside TasksProvider
const TasksWithContext: React.FC = () => {
  // usePreloadAppCoreData(); // Remove this - called in App.tsx

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const { tasks, isLoading, error, saveTask, deleteTask, toggleTaskCompletion, refetchTasks } = useTasks();
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
    setCurrentTask(null); // Keep null for new task
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
      const savedTask = await saveTask(taskData);
      // To prevent clearing inputs and closing the editor:
      // 1. Don't set isEditorOpen to false.
      // 2. If it's an update, set currentTask to the savedTask to reflect changes.
      //    If it's a new task creation, you might want to clear for the *next* new task,
      //    or keep it open for further edits if `savedTask` includes the new ID.
      // For now, we'll keep the editor open and update currentTask if an ID exists (update scenario)
      // or if a new task was created and returned with an ID.
      if (savedTask && savedTask.id) {
        setCurrentTask(savedTask); // Update form with potentially new/updated data from server
      }
      // setIsEditorOpen(false); // Keep editor open
      // setCurrentTask(null); // Don't clear current task, allow further edits or inspection
      
      // The optimistic update from saveTask should handle UI elsewhere.
      // Periodic sync for eventual consistency.
    } catch (err) {
      console.error('Error saving task:', err);
      // Error handling (e.g., toast) should be in saveTask or the mutation itself
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setCurrentTask(null);
      setIsEditorOpen(false); // Close editor on delete
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

  if (error && tasks.length === 0) { // Added error handling for initial load
    return (
      <div className="container mx-auto px-4 py-6 TasksContent">
        <TasksHeader />
        <div className="flex flex-col items-center justify-center mt-8">
          <div className="text-red-500 p-4 border border-red-400 rounded-md bg-red-900/20">
            <h3 className="font-bold mb-2">Error Loading Tasks</h3>
            <p>{error.message || "Couldn't connect to the server. Please try again."}</p>
          </div>
        </div>
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
  }

  return (
    <div className="p-4 pt-6 TasksContent">
      <TasksHeader />

      <TasksList
        tasks={tasks}
        isLoading={isLoading && tasks.length === 0} // Pass correct loading state for empty list
        onEditTask={handleEditTask}
        onToggleCompletion={handleToggleCompletion}
        onCreateTaskClick={handleAddTask} // Pass the handler
      />

      <TaskEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setCurrentTask(null); // Clear task when explicitly closing
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
