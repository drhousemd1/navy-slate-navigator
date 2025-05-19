import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import TaskEditor from '../components/TaskEditor';
import TasksHeader from '../components/task/TasksHeader';
import TasksList from '../components/task/TasksList';
import { RewardsProvider, useRewards } from '@/contexts/RewardsContext';
import { TaskWithId } from '@/data/tasks/types';
import { useSyncManager, SyncOptions, CRITICAL_QUERY_KEYS } from '@/hooks/useSyncManager';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useTasksData } from '@/hooks/useTasksData';

const TasksPageContent: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskWithId | null>(null);
  const { 
    tasks, 
    isLoading, 
    error, 
    saveTask, 
    deleteTask, 
    toggleTaskCompletion, 
  } = useTasksData();
  const { refreshPointsFromDatabase } = useRewards();
  
  useSyncManager({ 
    enabled: true 
  });

  const handleAddTask = () => {
    console.log('handleAddTask called in TasksPageContent');
    setCurrentTask(null);
    setIsEditorOpen(true);
  };

  React.useEffect(() => {
    console.log('Setting up event listener for add-new-task');
    const element = document.querySelector('.TasksContent'); 
    if (element) {
      const handleAddEvent = (event: Event) => { 
        console.log('Received add-new-task event', event);
        handleAddTask();
      };
      element.addEventListener('add-new-task', handleAddEvent);
      return () => {
        element.removeEventListener('add-new-task', handleAddEvent);
      };
    }
  }, []); 

  const handleEditTask = (task: TaskWithId) => {
    setCurrentTask(task);
    setIsEditorOpen(true);
  };

  const handleSaveTask = async (taskData: TaskWithId) => { 
    try {
      const savedTask = await saveTask(taskData);
      if (savedTask && savedTask.id) {
        // setCurrentTask(savedTask); 
      }
    } catch (err) {
      console.error('Error saving task in UI:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      // setCurrentTask(null); 
      // setIsEditorOpen(false);
    } catch (err) {
      console.error('Error deleting task in UI:', err);
    }
  };

  const handleToggleCompletion = async (taskId: string, completed: boolean) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.error(`Task with id ${taskId} not found.`);
        return;
      }
      // Assuming toggleTaskCompletion in useTasksData handles points correctly
      await toggleTaskCompletion(taskId, completed, task.points || 0); 
      if (completed) {
        setTimeout(() => {
          refreshPointsFromDatabase();
        }, 500); 
      }
    } catch (err) {
      console.error('Error toggling task completion in UI:', err);
    }
  };

  useEffect(() => {
    refreshPointsFromDatabase(); 
  }, [refreshPointsFromDatabase]); 

  if (error && !isLoading && tasks.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6 TasksContent">
        <TasksHeader /> {/* Removed onAddTask prop */}
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
      <TasksHeader /> {/* Removed onAddTask prop */}

      <TasksList
        tasks={tasks}
        isLoading={isLoading && tasks.length === 0} 
        onEditTask={handleEditTask}
        onToggleCompletion={handleToggleCompletion}
        onCreateTaskClick={handleAddTask} 
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

const Tasks: React.FC = () => {
  const handleAddNewItem = () => {
    console.log('AppLayout onAddNewItem called for Tasks');
    const content = document.querySelector('.TasksContent');
    if (content) {
      console.log('Dispatching add-new-task event to .TasksContent');
      const event = new CustomEvent('add-new-task');
      content.dispatchEvent(event);
    } else {
      console.warn('.TasksContent element not found for dispatching event. Ensure TasksPageContent renders a div with this class.');
    }
  };

  return (
    <AppLayout onAddNewItem={handleAddNewItem}>
      <RewardsProvider> {/* Consider if RewardsProvider is needed here or higher up */}
        <ErrorBoundary fallbackMessage="Could not load tasks. Please try reloading.">
          <TasksPageContent />
        </ErrorBoundary>
      </RewardsProvider>
    </AppLayout>
  );
};

export default Tasks;
