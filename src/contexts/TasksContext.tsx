import React, { createContext, useContext, ReactNode } from 'react';
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
  toggleTaskCompletion: (taskId: string, completed: boolean, points: number) => Promise<boolean>;
  refetchTasks: () => Promise<QueryObserverResult<Task[], Error>>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const TasksProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { 
    tasks, 
    isLoading, 
    error, 
    saveTask: saveTaskToDb, 
    deleteTask: deleteTaskFromDb, 
    toggleTaskCompletion: toggleTaskCompletionInDb,
    refetchTasks 
  } = useTasksData();

  const value: TasksContextType = {
    tasks,
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
