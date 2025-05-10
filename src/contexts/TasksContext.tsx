
import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, RefetchOptions, QueryObserverResult } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Task, saveTask, deleteTask, updateTaskCompletion } from '@/lib/taskUtils';
import { useTasksData } from '@/data/TasksDataHandler';

// Define the context type
interface TasksContextType {
  tasks: Task[];
  isLoading: boolean;
  error: Error | null;
  saveTask: (taskData: Partial<Task>) => Promise<Task | null>;
  deleteTask: (taskId: string) => Promise<boolean>;
  toggleTaskCompletion: (taskId: string, completed: boolean) => Promise<boolean>;
  refetchTasks: () => Promise<QueryObserverResult<Task[], Error>>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const TasksProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  
  // Get tasks with improved error handling
  const { 
    tasks, 
    isLoading, 
    error, 
    saveTask: saveTaskToDb, 
    deleteTask: deleteTaskFromDb, 
    toggleTaskCompletion: toggleTaskCompletionInDb,
    refetchTasks 
  } = useTasksData();

  // Debug logging to see what's actually happening with the data
  useEffect(() => {
    console.log('TasksContext data:', { 
      tasksExist: Boolean(tasks), 
      tasksLength: tasks?.length || 0, 
      isLoading, 
      hasError: Boolean(error) 
    });
  }, [tasks, isLoading, error]);

  // Explicitly initialize tasks as an empty array if it's undefined
  const effectiveTasks = tasks || [];

  const value: TasksContextType = {
    tasks: effectiveTasks,
    isLoading,
    error,
    saveTask: saveTaskToDb,
    deleteTask: deleteTaskFromDb,
    toggleTaskCompletion: toggleTaskCompletionInDb,
    refetchTasks
  };

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
};

export const useTasks = (): TasksContextType => {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
};
