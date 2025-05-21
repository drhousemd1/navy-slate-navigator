
import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import TaskEditor from '../components/TaskEditor';
import TasksHeader from '../components/task/TasksHeader';
import TasksList from '../components/task/TasksList';
import { RewardsProvider, useRewards } from '@/contexts/RewardsContext'; // Keep useRewards for now for the useEffect
import { TaskWithId } from '@/data/tasks/types';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useTasksData } from '@/hooks/useTasksData';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import { ListChecks, LoaderCircle } from 'lucide-react';
import { useToggleTaskCompletionMutation } from '../data/tasks/mutations/useToggleTaskCompletionMutation'; // New import

const TasksPageContent: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskWithId | null>(null);
  const { 
    tasks, 
    isLoading, 
    error, 
    saveTask, 
    deleteTask, 
    // toggleTaskCompletion, // Removed from here
    refetch 
  } = useTasksData();
  const { refreshPointsFromDatabase } = useRewards(); // Still used in useEffect
  
  const toggleTaskCompletionMutation = useToggleTaskCompletionMutation(); // New mutation hook instance

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
      // Use the mutation hook
      toggleTaskCompletionMutation.mutate({ 
        taskId, 
        completed, 
        pointsValue: task.points || 0,
        task // Pass the full task object for potential optimistic updates defined in the mutation
      });
      // The refreshPointsFromDatabase call previously here is removed
      // because useToggleTaskCompletionMutation handles query invalidations for points.
    } catch (err) {
      // Error handling for calling mutate (e.g., if task not found)
      // The mutation itself has more robust error handling for the async operation
      console.error('Error preparing to toggle task completion in UI:', err);
    }
  };

  useEffect(() => {
    // This useEffect might be for initial load or other general refresh needs.
    // The mutation hook specifically handles refresh *after* a task completion.
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
        icon={ListChecks} 
        title="No Tasks Yet"
        description="You do not have any tasks yet, create one to get started."
      />
    );
  } else {
    content = (
      <TasksList
        tasks={tasks}
        isLoading={false} // tasks prop implies data is loaded, or loading state is handled above
        onEditTask={handleEditTask}
        onToggleCompletion={handleToggleCompletion}
        error={error} 
      />
    );
  }

  return (
    <div className="p-4 pt-6 TasksContent">
      <TasksHeader /> 
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
