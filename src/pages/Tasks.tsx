
import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import TaskEditor from '../components/TaskEditor';
import TasksHeader from '../components/task/TasksHeader';
import TasksList from '../components/task/TasksList';
import { RewardsProvider, useRewards } from '@/contexts/RewardsContext';
import { TasksProvider, useTasks } from '../contexts/TasksContext';
import { Task } from '@/lib/taskUtils';
import ErrorBoundary from '@/components/ErrorBoundary';
import useTasksQuery from '@/data/queries/useTasks'; // Import the new hook

// Separate component that uses useTasks hook inside TasksProvider
const TasksWithContext: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  
  // Use the new Tasks query hook
  const {
    data: tasks = [],
    isLoading,
    error
  } = useTasksQuery();
  
  // Use existing context for operations
  const { saveTask, deleteTask, toggleTaskCompletion } = useTasks();
  const { refreshPointsFromDatabase } = useRewards();

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
      if (savedTask && savedTask.id) {
        setCurrentTask(savedTask);
      }
    } catch (err) {
      console.error('Error saving task:', err);
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

  if (isLoading && !tasks.length) {
    // Show just the header during loading
    return (
      <div className="p-4 pt-6 TasksContent">
        <TasksHeader />
      </div>
    );
  }

  if (!isLoading && (!tasks || tasks.length === 0)) {
    // Show empty state
    return (
      <div className="p-4 pt-6 TasksContent">
        <TasksHeader />
        <div className="text-white text-center mt-8">
          <p>You currently have no tasks.</p>
          <p>Please create one to continue.</p>
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

  // We have data
  return (
    <div className="p-4 pt-6 TasksContent">
      <TasksHeader />

      <TasksList
        tasks={tasks}
        isLoading={false} // We're handling loading state separately now
        onEditTask={handleEditTask}
        onToggleCompletion={handleToggleCompletion}
        onCreateTaskClick={handleAddTask}
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
