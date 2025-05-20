
import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import TaskEditor from '../components/TaskEditor';
import TasksHeader from '../components/task/TasksHeader';
import TasksList from '../components/task/TasksList';
import { RewardsProvider, useRewards } from '@/contexts/RewardsContext';
import { TaskWithId } from '@/data/tasks/types';
import { useSyncManager } from '@/hooks/useSyncManager';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useTasksData } from '@/hooks/useTasksData';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import { ListChecks, LoaderCircle } from 'lucide-react';

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
    refetch // Changed from refetchTasks to refetch
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

  let content;
  if (isLoading && tasks.length === 0) {
    content = (
      <div className="flex flex-col items-center justify-center py-10 mt-4">
        <LoaderCircle className="h-10 w-10 text-primary animate-spin mb-2" />
        <p className="text-muted-foreground">Loading tasks...</p>
      </div>
    );
  } else if (error && tasks.length === 0) {
    content = (
      <ErrorDisplay
        title="Error Loading Tasks"
        message={error.message || "Could not fetch tasks. Please check your connection or try again later."}
      />
    );
  } else if (!isLoading && tasks.length === 0 && !error) {
    content = (
      <EmptyState
        icon={ListChecks} // Example icon for tasks
        title="No Tasks Yet"
        description="You do not have any tasks yet, create one to get started."
      />
    );
  } else {
    content = (
      <TasksList
        tasks={tasks}
        isLoading={false} // Main loading handled above, TasksList internal loader might still trigger if it has own logic
        onEditTask={handleEditTask}
        onToggleCompletion={handleToggleCompletion}
        error={error} // Pass error for potential internal handling in read-only TasksList
      />
    );
  }

  return (
    <div className="p-4 pt-6 TasksContent">
      <TasksHeader /> {/* Removed onAddTask prop if it was there */}
      {content}
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
      <RewardsProvider>
        <ErrorBoundary fallbackMessage="Could not load tasks. Please try reloading.">
          <TasksPageContent />
        </ErrorBoundary>
      </RewardsProvider>
    </AppLayout>
  );
};

export default Tasks;
