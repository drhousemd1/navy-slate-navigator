import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
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

interface TasksContentProps {
    isEditorOpen: boolean;
    setIsEditorOpen: (isOpen: boolean) => void;
}

const TasksContent: React.FC<TasksContentProps> = ({ isEditorOpen, setIsEditorOpen }) => {
    const queryClient = useQueryClient();
    const { refreshPointsFromDatabase } = useRewards();

    const { carouselTimer, globalCarouselIndex } = useTaskCarousel();

    // Fetch tasks using React Query
    const { data: tasks = [], isLoading, error } = useQuery({
        queryKey: ['tasks'],
        queryFn: fetchTasks,
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
    });

    // Handler to open editor for a new task
    const handleNewTask = () => {
        setIsEditorOpen(true);
    };

    // Handler to open editor for an existing task
    const handleEditTask = (task: Task) => {
        setIsEditorOpen(true);
    };

    // Mutation for saving a task
    const saveTaskMutation = useMutation({
        mutationFn: saveTask,
        onSuccess: () => {
            // Invalidate the tasks query to refetch the data
            queryClient.invalidateQueries(['tasks']);
            toast({
                title: 'Success',
                description: 'Task saved successfully!',
            });
            setIsEditorOpen(false);
        },
        onError: () => {
            toast({
                title: 'Error',
                description: 'Failed to save task. Please try again.',
                variant: 'destructive',
            });
        },
    });

    // Mutation for deleting a task
    const deleteTaskMutation = useMutation({
        mutationFn: deleteTask,
        onSuccess: () => {
            // Invalidate the tasks query to refetch the data
            queryClient.invalidateQueries(['tasks']);
            toast({
                title: 'Success',
                description: 'Task deleted successfully!',
            });
            setIsEditorOpen(false);
        },
        onError: () => {
            toast({
                title: 'Error',
                description: 'Failed to delete task. Please try again.',
                variant: 'destructive',
            });
        },
    });

    // Handler to save a new or existing task
    const handleSaveTask = async (taskData: Task) => {
        saveTaskMutation.mutate(taskData);
    };

    // Handler to delete a task
    const handleDeleteTask = async (taskId: string) => {
        deleteTaskMutation.mutate(taskId);
    };

    // Mutation for toggling task completion status
    const toggleCompletionMutation = useMutation({
        mutationFn: ({ taskId, completed }: { taskId: string; completed: boolean }) =>
            updateTaskCompletion(taskId, completed), // Calls the backend update function

        onSuccess: async (updatedTask) => {
            if (updatedTask) {
                // Refresh user points if the task was marked as completed
                if (updatedTask.completed) {
                    await refreshPointsFromDatabase();
                }
                // Invalidate the tasks query to refetch the data
                queryClient.invalidateQueries(['tasks']);
            } else {
                toast({
                    title: 'Update Failed',
                    description: 'Failed to update task completion.',
                    variant: 'destructive',
                });
            }
        },
        onError: (err) => {
            console.error('Error toggling task completion:', err);
            toast({
                title: 'Error',
                description: 'Failed to update task. Please try again.',
                variant: 'destructive',
            });
        },
    });

    // Handler called when the completion button is clicked
    const handleToggleCompletion = async (taskId: string, completed: boolean) => {
        try {
            const task = (tasks as Task[]).find(t => t.id === taskId);
            if (!task) {
                console.error("Task not found for toggle:", taskId);
                return;
            }

            const dayOfWeek = getCurrentDayOfWeek(); // Use imported utility function
            const currentUsage = task.usage_data ? [...task.usage_data] : Array(7).fill(0);
            const maxCompletions = task.frequency_count || 1;

            if (currentUsage[dayOfWeek] >= maxCompletions && completed) {
                toast({
                    title: 'Maximum completions reached',
                    description: 'You have already completed this task the maximum number of times today.',
                    variant: 'default',
                });
                return;
            }

            // Execute the mutation
            toggleCompletionMutation.mutate({ taskId, completed });

        } catch (error) {
            console.error("Error toggling task completion:", error);
            toast({
                title: 'Error',
                description: 'Failed to update task. Please try again.',
                variant: 'destructive',
            });
        }
    };

    // Render the main content of the Tasks page
    return (
        <div className="p-4 pt-6">
            <TasksHeader />

            {isLoading ? (
                <div className="text-white">Loading tasks...</div>
            ) : error ? (
                <div className="text-white">Error loading tasks.</div>
            ) : tasks.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-light-navy mb-4">No tasks found. Create your first task to get started!</p>
                </div>
            ) : (
                // Render the list of tasks
                <div className="space-y-4">
                    {(tasks as Task[]).map(task => {
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
                                completed={task.completed}
                                backgroundImage={task.background_image_url}
                                backgroundOpacity={task.background_opacity}
                                focalPointX={task.focal_point_x}
                                focalPointY={task.focal_point_y}
                                frequency={task.frequency}
                                frequency_count={task.frequency_count}
                                usage_data={usageDataForTask}
                                icon_url={task.icon_url}
                                icon_name={task.icon_name}
                                priority={task.priority}
                                highlight_effect={task.highlight_effect}
                                title_color={task.title_color}
                                subtext_color={task.subtext_color}
                                calendar_color={task.calendar_color}
                                icon_color={task.icon_color}
                                onEdit={() => handleEditTask(task)}
                                onToggleCompletion={(completed) => handleToggleCompletion(task.id, completed)}
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
                }}
                taskData={null} // Pass task data if editing
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
        setIsEditorOpen(true);
    };

    return (
        <AppLayout onAddNewItem={handleNewTask}>
            <TaskCarouselProvider> {/* Provides carousel context */}
                <RewardsProvider> {/* Provides rewards context */}
                    <TasksContent
                        isEditorOpen={isEditorOpen}
                        setIsEditorOpen={setIsEditorOpen}
                    />
                </RewardsProvider>
            </TaskCarouselProvider>
        </AppLayout>
    );
};

export default Tasks;
