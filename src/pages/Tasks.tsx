import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import TaskEditor from '../components/TaskEditor';
import TasksHeader from '../components/task/TasksHeader';
import TasksList from '../components/task/TasksList';
import { RewardsProvider, useRewards } from '@/contexts/RewardsContext';
import { TaskWithId, CreateTaskVariables, UpdateTaskVariables } from '@/data/tasks/types';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useTasksData } from '@/hooks/useTasksData';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import { ListChecks, LoaderCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const TasksPageContent: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskWithId | null>(null);
  const { 
    tasks, 
    isLoading, 
    error, 
    createTask, 
    updateTask, 
    deleteTask, 
    toggleTaskCompletion,
    refetchTasks 
  } = useTasksData();
  const { refreshPointsFromDatabase } = useRewards();
  

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

  const handleSaveTask = async (taskData: Partial<TaskWithId> & { user_id?: string }) => { 
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Authentication Error", description: "User not found for saving task.", variant: "destructive" });
        return;
      }

      if (taskData.id) { // Update existing task
        // Ensure all required fields for UpdateTaskVariables are present or handled
        const updatePayload: UpdateTaskVariables = {
          id: taskData.id,
          // Only include fields that are actually being updated
          ...(taskData.title && { title: taskData.title }),
          ...(taskData.points !== undefined && { points: taskData.points }),
          ...(taskData.description && { description: taskData.description }),
          ...(taskData.frequency && { frequency: taskData.frequency }),
          ...(taskData.frequency_count !== undefined && { frequency_count: taskData.frequency_count }),
          ...(taskData.priority && { priority: taskData.priority }),
          // Add other updatable fields from TaskWithId / UpdateTaskVariables as needed
        };
        await updateTask(updatePayload);
      } else { // Create new task
        // Ensure all required fields for CreateTaskVariables are present
        if (!taskData.title || typeof taskData.points !== 'number') {
            toast({ title: "Validation Error", description: "Title and points are required to create a task.", variant: "destructive" });
            return;
        }
        const createPayload: CreateTaskVariables = {
          title: taskData.title,
          points: taskData.points,
          user_id: user.id, // Add user_id
          description: taskData.description || '',
          frequency: taskData.frequency || 'daily',
          frequency_count: taskData.frequency_count || 1,
          priority: taskData.priority || 'medium',
          // Add other fields from CreateTaskVariables as needed, providing defaults
        };
        await createTask(createPayload);
      }
      refetchTasks(); // Refetch tasks after save
    } catch (err) {
      console.error('Error saving task in UI:', err);
      toast({ title: "Save Error", description: (err instanceof Error ? err.message : "Could not save task."), variant: "destructive" });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      refetchTasks(); // Refetch tasks after delete
    } catch (err) {
      console.error('Error deleting task in UI:', err);
      toast({ title: "Delete Error", description: (err instanceof Error ? err.message : "Could not delete task."), variant: "destructive" });
    }
  };

  const handleToggleCompletion = async (taskId: string, completed: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Authentication Error", description: "User not found for task completion.", variant: "destructive" });
        return;
      }
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.error(`Task with id ${taskId} not found.`);
        toast({ title: "Error", description: `Task with id ${taskId} not found.`, variant: "destructive" });
        return;
      }
      // Ensure all required fields for ToggleTaskCompletionVariables are present
      if (task.frequency === undefined || task.frequency_count === undefined) {
        toast({ title: "Task Data Error", description: "Task frequency data is missing.", variant: "destructive" });
        return;
      }

      await toggleTaskCompletion({
        taskId: taskId,
        isCompleted: completed,
        points: task.points || 0,
        frequency: task.frequency,
        frequency_count: task.frequency_count,
        last_completed_date: task.last_completed_date || null,
        week_identifier: task.week_identifier || null,
        user_id: user.id,
      });
      
      // Refetch tasks to update UI, points refresh is handled by mutation's onSuccess
      refetchTasks();

      if (completed) {
        setTimeout(() => {
          refreshPointsFromDatabase();
        }, 500); 
      } else {
        // If un-completing, also refresh points if points were deducted
        if ((task.points || 0) > 0) {
             setTimeout(() => {
                refreshPointsFromDatabase();
            }, 500);
        }
      }
    } catch (err) {
      console.error('Error toggling task completion in UI:', err);
      toast({ title: "Completion Error", description: (err instanceof Error ? err.message : "Could not toggle task completion."), variant: "destructive" });
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
      />
    );
  } else {
    content = (
      <TasksList
        tasks={tasks}
        isLoading={isLoading} 
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
        onDelete={currentTask ? () => handleDeleteTask(currentTask.id) : undefined}
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
