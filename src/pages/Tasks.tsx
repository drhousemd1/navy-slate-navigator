import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import AppLayout from '../components/AppLayout';
import TaskCard from '../components/TaskCard';
import TaskEditor from '../components/TaskEditor';
import TasksHeader from '../components/task/TasksHeader';
import { RewardsProvider, useRewards } from '../contexts/RewardsContext';
import { TaskCarouselProvider, useTaskCarousel } from '../contexts/TaskCarouselContext';
import {
    fetchTasks,
    Task,
    saveTask,
    updateTaskCompletion,
    deleteTask,
    getLocalDateString,
    wasCompletedToday,
    getCurrentDayOfWeek // Ensure getCurrentDayOfWeek is imported
} from '../lib/taskUtils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Create a new QueryClient instance
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 20,       // Consider data fresh for 20 minutes
            cacheTime: 1000 * 60 * 30,       // Keep data in memory for 30 minutes after inactive
            refetchOnWindowFocus: false      // Avoid refetch when switching back to tab
        },
    },
});

//Implement LocalStorage persistence
const localStoragePersister = createSyncStoragePersister({
    storage: window.localStorage,
})

persistQueryClient({
    queryClient,
    persister: localStoragePersister,
    maxAge: 1000 * 60 * 20 // Persisted data valid for 20 minutes
});


interface TasksContentProps {
    isEditorOpen: boolean;
    setIsEditorOpen: (isOpen: boolean) => void;
}

const TasksContent: React.FC<TasksContentProps> = ({ isEditorOpen, setIsEditorOpen }) => {
    const [currentTask, setCurrentTask] = useState<Task | null>(null);
    const queryClient = useQueryClient();
    const { refreshPointsFromDatabase } = useRewards();

    const { carouselTimer, globalCarouselIndex } = useTaskCarousel();

    // Fetch tasks using React Query
    const { data: tasks = [], isLoading, error, refetch } = useQuery({
        queryKey: ['tasks'],
        queryFn: fetchTasks,
    });

    // Effect for daily task reset checks
    useEffect(() => {
        const checkForReset = () => {
            const now = new Date();
            console.log('Checking for task reset. Current local time:', now.toLocaleTimeString());

            if (tasks.length > 0) {
                const tasksToReset = tasks.filter(task =>
                    task.completed &&
                    task.frequency === 'daily' &&
                    !wasCompletedToday(task)
                );

                if (tasksToReset.length > 0) {
                    console.log('Found tasks that need to be reset:', tasksToReset.length);
                    // Invalidate tasks query to trigger refetch and reset completed status
                    queryClient.invalidateQueries({ queryKey: ['tasks'] });
                }
            }
        };

        checkForReset(); // Initial check on mount

        // Schedule a check precisely at midnight
        const scheduleMidnightCheck = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const timeUntilMidnight = tomorrow.getTime() - now.getTime();
            console.log('Time until midnight check:', timeUntilMidnight, 'ms');

            return setTimeout(() => {
                console.log('Midnight reached, checking tasks for reset');
                queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Refetch tasks at midnight

                // Reschedule for the next midnight
                const newTimeout = scheduleMidnightCheck();
                return () => clearTimeout(newTimeout); // Cleanup function for timeout
            }, timeUntilMidnight);
        };

        const timeoutId = scheduleMidnightCheck();

        // Cleanup timeout on component unmount
        return () => clearTimeout(timeoutId);
    }, [queryClient, tasks]); // Rerun effect if queryClient or tasks change

    // Effect to handle errors during task fetching
    useEffect(() => {
        if (error) {
            toast({
                title: 'Error',
                description: 'Failed to load tasks. Please try again.',
                variant: 'destructive',
            });
        }
    }, [error]); // Rerun effect if error changes

    // Handler to open editor for a new task
    const handleNewTask = () => {
        console.log("Creating new task");
        setCurrentTask(null); // No current task
        setIsEditorOpen(true);
    };

    // Handler to open editor for an existing task
    const handleEditTask = (task: Task) => {
        console.log("Editing task:", task);
        setCurrentTask(task);
        setIsEditorOpen(true);
    };

    // Handler to save a new or existing task
    const handleSaveTask = async (taskData: Task) => {
        try {
            console.log("Saving task:", taskData);
            const savedTask = await saveTask(taskData); // Call utility function to save

            if (savedTask) {
                // Invalidate tasks query to refetch the updated list
                queryClient.invalidateQueries({ queryKey: ['tasks'] });
                toast({
                    title: 'Success',
                    description: `Task ${currentTask ? 'updated' : 'created'} successfully!`,
                });
                setIsEditorOpen(false); // Close editor on success
            }
        } catch (err) {
            console.error('Error saving task:', err);
            toast({
                title: 'Error',
                description: 'Failed to save task. Please try again.',
                variant: 'destructive',
            });
        }
    };

    // Handler to delete a task
    const handleDeleteTask = async (taskId: string) => {
        try {
            console.log("Deleting task:", taskId);
            const success = await deleteTask(taskId); // Call utility function to delete

            if (success) {
                setCurrentTask(null);
                setIsEditorOpen(false);
                // Invalidate tasks query to refetch the list without the deleted task
                queryClient.invalidateQueries({ queryKey: ['tasks'] });
                toast({
                    title: 'Success',
                    description: 'Task deleted successfully!',
                });
            }
        } catch (err) {
            console.error('Error deleting task:', err);
            toast({
                title: 'Error',
                description: 'Failed to delete task. Please try again.',
                variant: 'destructive',
            });
        }
    };

    // Mutation for toggling task completion status
    const toggleCompletionMutation = useMutation({
        mutationFn: ({ taskId, completed }: { taskId: string; completed: boolean }) =>
            updateTaskCompletion(taskId, completed),
        onMutate: async ({ taskId, completed }) => {
            // Cancel any outgoing tasks queries, so they don't overwrite the optimistic update
            await queryClient.cancelQueries({ queryKey: ['tasks'] });

            // Snapshot the previous value
            const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

             // Get the current day of the week
            const dayOfWeek = getCurrentDayOfWeek();

            // Optimistically update to the new value
            queryClient.setQueryData<Task[]>(['tasks'], (old) =>
                old?.map((task) => {
                    if (task.id === taskId) {
                        // Get the current usage data for the task
                        const currentUsage = task.usage_data ? [...task.usage_data] : Array(7).fill(0);

                         // Get max completions from the task object
                        const maxCompletions = task.frequency_count || 1;

                        // Update the usage data for the current day of the week
                        const optimisticUsage = [...currentUsage];
                        optimisticUsage[dayOfWeek] = completed ? Math.min(optimisticUsage[dayOfWeek] + 1, maxCompletions) : Math.max(optimisticUsage[dayOfWeek] - 1, 0);

                        return { ...task, completed: completed, usage_data: optimisticUsage };
                    }
                    return task;
                }) ?? []
            );

            // Return a context object with the snapshotted value
            return { previousTasks };
        },
        onError: (err, { taskId, completed }, context: any) => {
            console.error('Error toggling task completion:', err);
            toast({
                title: 'Error',
                description: 'Failed to update task. Please try again.',
                variant: 'destructive',
            });
            // Rollback to the previous value
            queryClient.setQueryData<Task[]>(['tasks'], context.previousTasks);
        },
        onSettled: () => {
            // After success or failure, refetch tasks to ensure accuracy
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
             queryClient.invalidateQueries({ queryKey: ['task-completions'] });
             queryClient.invalidateQueries({ queryKey: ['weekly-metrics'] });
             queryClient.invalidateQueries({ queryKey: ['monthly-metrics'] });
             queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });
             refreshPointsFromDatabase();
        },
    });

    // Render the main content of the Tasks page
    return (
        <div className="p-4 pt-6">
            <TasksHeader />

            {isLoading && tasks.length === 0 ? (
                <div className="text-white">Loading tasks...</div>
            ) : tasks.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-light-navy mb-4">No tasks found. Create your first task to get started!</p>
                </div>
            ) : (
                // Render the list of tasks
                <div className="space-y-4">
                    {tasks.map(task => {
                        // Get usage data for the specific task, defaulting if necessary
                        const usageDataForTask = task.usage_data || Array(7).fill(0);
                        const currentDayOfWeek = getCurrentDayOfWeek();
                        const currentCompletions = usageDataForTask[currentDayOfWeek] || 0;

                        return (
                            <TaskCard
                                key={task.id}
                                title={task.title}
                                description={task.description}
                                points={task.points}
                                completed={task.completed} // Pass the confirmed completed status
                                backgroundImage={task.background_image_url}
                                backgroundOpacity={task.background_opacity}
                                focalPointX={task.focal_point_x}
                                focalPointY={task.focal_point_y}
                                frequency={task.frequency}
                                frequency_count={task.frequency_count}
                                usage_data={usageDataForTask} // Pass potentially updated local usage data
                                icon_url={task.icon_url}
                                icon_name={task.icon_name}
                                priority={task.priority}
                                highlight_effect={task.highlight_effect}
                                title_color={task.title_color}
                                subtext_color={task.subtext_color}
                                calendar_color={task.calendar_color}
                                icon_color={task.icon_color}
                                onEdit={() => handleEditTask(task)}
                                // Pass the handler function to the TaskCard
                                onToggleCompletion={(completed) => toggleCompletionMutation.mutate({taskId: task.id, completed})}
                                backgroundImages={task.background_images}
                                sharedImageIndex={globalCarouselIndex}
                            />
                        );
                    })}
                </div>
            )}

            {/* Task Editor Modal */}
            <TaskEditor
                isOpen={isEditorOpen}
                onClose={() => {
                    setIsEditorOpen(false);
                    setCurrentTask(null); // Clear current task when closing
                }}
                taskData={currentTask || undefined} // Pass task data if editing
                onSave={handleSaveTask}
                onDelete={handleDeleteTask}
            />
        </div>
    );
};

// Main Tasks component wrapping the content with providers and layout
const Tasks: React.FC = () => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    // Handler passed to AppLayout to trigger opening the editor for a new task
    const handleNewTask = () => {
        console.log("Parent component triggering new task");
        setIsEditorOpen(true);
    };

    return (
        <AppLayout onAddNewItem={handleNewTask}>
            <QueryClientProvider client={queryClient}>
                <TaskCarouselProvider> {/* Provides carousel context */}
                    <RewardsProvider> {/* Provides rewards context */}
                        <TasksContent
                            isEditorOpen={isEditorOpen}
                            setIsEditorOpen={setIsEditorOpen}
                        />
                    </RewardsProvider>
                </TaskCarouselProvider>
            </QueryClientProvider>
        </AppLayout>
    );
};

export default Tasks;
