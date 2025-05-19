
import React, { createContext, useContext, ReactNode } from 'react';
import { QueryObserverResult } from '@tanstack/react-query';
// Removed unused toast import and functions from lib/taskUtils as they come from useTasksData
import { Task } from '@/data/tasks/types'; // Updated import path for Task
import { useTasksData } from '@/data/TasksDataHandler';

// Define the context type
interface TasksContextType {
  tasks: Task[]; // Uses the imported Task type
  isLoading: boolean;
  error: Error | null;
  saveTask: (taskData: Partial<Task>) => Promise<Task | null>; // Uses imported Task
  deleteTask: (taskId: string) => Promise<boolean>;
  toggleTaskCompletion: (taskId: string, completed: boolean, points: number) => Promise<boolean>;
  refetchTasks: () => Promise<QueryObserverResult<Task[], Error>>; // Uses imported Task
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const TasksProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { 
    tasks, 
    isLoading, 
    error, 
    saveTask: saveTaskFromHook, // Renamed to avoid conflict if we were importing saveTask directly
    deleteTask: deleteTaskFromHook, 
    toggleTaskCompletion: toggleTaskCompletionFromHook,
    refetchTasks 
  } = useTasksData();

  const value: TasksContextType = {
    tasks,
    isLoading,
    error,
    saveTask: saveTaskFromHook,
    deleteTask: deleteTaskFromHook,
    toggleTaskCompletion: toggleTaskCompletionFromHook,
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
