import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import TaskEditor from '../components/TaskEditor';
import TasksHeader from '../components/task/TasksHeader';
import TasksList from '../components/task/TasksList';
import { RewardsProvider, useRewards } from '@/contexts/RewardsContext';
import { TaskWithId, TaskFormValues, CreateTaskVariables, UpdateTaskVariables } from '@/data/tasks/types';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useTasksData } from '@/hooks/useTasksData';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import { ListChecks, LoaderCircle } from 'lucide-react';
import { useToggleTaskCompletionMutation } from '../data/tasks/mutations/useToggleTaskCompletionMutation';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const TasksPageContent: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskWithId | null>(null);
  const { 
    tasks, 
    isLoading, 
    error, 
    saveTask, 
    deleteTask, 
    // refetch 
  } = useTasksData();
  const { refreshPointsFromDatabase } = useRewards();
  
  const toggleTaskCompletionMutation = useToggleTaskCompletionMutation();

  const handleAddTask = () => {
    logger.debug('handleAddTask called in TasksPageContent');
    setCurrentTask(null);
    setIsEditorOpen(true);
  };

  React.useEffect(() => {
    logger.debug('Setting up event listener for add-new-task');
    const element = document.querySelector('.TasksContent'); 
    if (element) {
      const handleAddEvent = (event: Event) => { 
        logger.debug('Received add-new-task event', event);
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

  const handleSaveTask = async (formData: TaskFormValues) => { 
    try {
      let taskToSave: CreateTaskVariables | UpdateTaskVariables; 
      if (currentTask && currentTask.id) {
        taskToSave = { ...formData, id: currentTask.id };
      } else {
        taskToSave = { 
          ...formData, 
          usage_data: Array(7).fill(0), 
          background_images: null 
        };
      }
      await saveTask(taskToSave as any); // Cast to any as `saveTask` handles the precise mapping
      setIsEditorOpen(false);
      setCurrentTask(null);
    } catch (e: unknown) {
      let errorMessage = "Failed to save task.";
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      logger.error('Error saving task in UI:', errorMessage, e);
      toast({ title: "Save Error", description: errorMessage, variant: "destructive" });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setIsEditorOpen(false);
      setCurrentTask(null);
    } catch (e: unknown) {
      let errorMessage = "Failed to delete task.";
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      logger.error('Error deleting task in UI:', errorMessage, e);
      toast({ title: "Delete Error", description: errorMessage, variant: "destructive" });
    }
  };

  const handleToggleCompletion = async (taskId: string, completed: boolean) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        logger.error(`Task with id ${taskId} not found.`);
        toast({ title: "Error", description: `Task with id ${taskId} not found.`, variant: "destructive" });
        return;
      }
      toggleTaskCompletionMutation.mutate({ 
        taskId, 
        completed, 
        pointsValue: task.points || 0,
        task 
      });
    } catch (e: unknown) {
      let errorMessage = "Failed to toggle task completion.";
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      logger.error('Error preparing to toggle task completion in UI:', errorMessage, e);
      toast({ title: "Toggle Error", description: errorMessage, variant: "destructive" });
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
        icon={ListChecks} 
        title="No Tasks Yet"
        description="You do not have any tasks yet, create one to get started."
        action={ 
          <Button onClick={handleAddTask} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Create New Task
          </Button>
        }
      />
    );
  } else {
    content = (
      <TasksList
        tasks={tasks}
        isLoading={false} 
        onEditTask={handleEditTask}
        onToggleCompletion={handleToggleCompletion}
        error={error} 
      />
    );
  }

  return (
    <div className="p-4 pt-6 TasksContent">
      <TasksHeader onAddNewTask={handleAddTask} /> 
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
    logger.debug('AppLayout onAddNewItem called for Tasks');
    const contentElement = document.querySelector('.TasksContent');
    if (contentElement) {
      logger.debug('Dispatching add-new-task event to .TasksContent');
      const event = new CustomEvent('add-new-task');
      contentElement.dispatchEvent(event);
    } else {
      logger.warn('.TasksContent element not found for dispatching event. Ensure TasksPageContent renders a div with this class.');
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
