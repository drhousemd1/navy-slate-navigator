// src/data/TaskDataHandler.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task } from '@/lib/taskUtils';
import { supabase } from '@/integrations/supabase/client';
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
});

// Function to persist the query client (assumes you have a queryClient instance)
export const persistTasksQueryClient = (queryClient: any) => {
  persistQueryClient({
    queryClient,
    persister: localStoragePersister,
    maxAge: 1000 * 60 * 20 // Persisted data valid for 20 minutes
  });
};

// Function to fetch tasks from Supabase
const fetchTasks = async () => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as Task[];
};

// useQuery hook to fetch tasks
export const useTasks = () => {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    staleTime: 1000 * 60 * 20,       // Consider data fresh for 20 minutes
    cacheTime: 1000 * 60 * 30,       // Keep data in memory for 30 minutes after inactive
    refetchOnWindowFocus: false      // Avoid refetch when switching back to tab
  });
};


// Function to update a task in Supabase
const updateTask = async (task: Partial<Task>) => {
  const { data, error } = await supabase
    .from('tasks')
    .update(task)
    .eq('id', task.id)
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// useMutation hook to update a task
export const useUpdateTask = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateTask,
        onMutate: async (updatedTask) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: ['tasks'] })

            // Snapshot the previous value
            const previousTasks = queryClient.getQueryData<Task[]>(['tasks'])

            // Optimistically update to the new value
            queryClient.setQueryData<Task[]>(['tasks'], (old) =>
                old?.map((task) =>
                    task.id === updatedTask.id ? { ...task, ...updatedTask } : task
                ) ?? []
            )

            // Return a context object with the snapshotted value
            return { previousTasks }
        },
        onError: (err, updatedTask, context: any) => {
            queryClient.setQueryData<Task[]>(['tasks'], context.previousTasks)
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
        },
    })
};