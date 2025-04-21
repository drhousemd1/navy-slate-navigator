import { supabase } from "@/integrations/supabase/client";
import { toast } from '@/hooks/use-toast';

export interface Task {
    id: string;
    title: string;
    description: string | null;
    priority: 'low' | 'medium' | 'high';
    points: number;
    background_image_url?: string | null;
    background_opacity: number;
    icon_url?: string | null;
    icon_name?: string | null;
    title_color: string;
    subtext_color: string;
    calendar_color: string;
    icon_color: string;
    highlight_effect: boolean;
    focal_point_x: number;
    focal_point_y: number;
    frequency: 'daily' | 'weekly';
    frequency_count: number;
    usage_data: number[];
    completed: boolean;
    created_at?: string;
    updated_at?: string;
    user_id?: string;
    background_images?: string[];
}

export const fetchTasks = async (): Promise<Task[]> => {
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching tasks:', error);
        toast({
            title: 'Error',
            description: 'Failed to fetch tasks. Please try again.',
            variant: 'destructive',
        });
        throw error;
    }

    return data as Task[];
};

export const saveTask = async (taskData: Task): Promise<Task> => {
    const {
        id,
        title,
        description,
        priority,
        points,
        background_image_url,
        background_opacity,
        icon_url,
        icon_name,
        title_color,
        subtext_color,
        calendar_color,
        icon_color,
        highlight_effect,
        focal_point_x,
        focal_point_y,
        frequency,
        frequency_count,
        usage_data,
        completed,
        background_images,
    } = taskData;

    if (id) {
        // Update existing task
        const { data, error } = await supabase
            .from('tasks')
            .update({
                title,
                description,
                priority,
                points,
                background_image_url,
                background_opacity,
                icon_url,
                icon_name,
                title_color,
                subtext_color,
                calendar_color,
                icon_color,
                highlight_effect,
                focal_point_x,
                focal_point_y,
                frequency,
                frequency_count,
                usage_data,
                completed,
                background_images,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating task:', error);
            toast({
                title: 'Error',
                description: 'Failed to update task. Please try again.',
                variant: 'destructive',
            });
            throw error;
        }
        return data as Task;
    } else {
        // Create new task
        const { data, error } = await supabase
            .from('tasks')
            .insert([
                {
                    title,
                    description,
                    priority,
                    points,
                    background_image_url,
                    background_opacity,
                    icon_url,
                    icon_name,
                    title_color,
                    subtext_color,
                    calendar_color,
                    icon_color,
                    highlight_effect,
                    focal_point_x,
                    focal_point_y,
                    frequency,
                    frequency_count,
                    usage_data,
                    completed,
                    background_images,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    user_id: (await supabase.auth.getUser()).data.user?.id,
                },
            ])
            .select()
            .single();

        if (error) {
            console.error('Error creating task:', error);
            toast({
                title: 'Error',
                description: 'Failed to create task. Please try again.',
                variant: 'destructive',
            });
            throw error;
        }
        return data as Task;
    }
};

export const updateTaskCompletion = async (taskId: string, completed: boolean): Promise<Task> => {
    const { data, error } = await supabase
        .from('tasks')
        .update({ completed })
        .eq('id', taskId)
        .select()
        .single();

    if (error) {
        console.error('Error updating task completion:', error);
        toast({
            title: 'Error',
            description: 'Failed to update task completion. Please try again.',
            variant: 'destructive',
        });
        throw error;
    }

    return data as Task;
};

export const deleteTask = async (taskId: string): Promise<void> => {
    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

    if (error) {
        console.error('Error deleting task:', error);
        toast({
            title: 'Error',
            description: 'Failed to delete task. Please try again.',
            variant: 'destructive',
        });
        throw error;
    }
};

export const getLocalDateString = (date: Date): string => {
    return date.toLocaleDateString(
        undefined,
        { year: 'numeric', month: 'long', day: 'numeric' }
    );
};

export const wasCompletedToday = (task: Task): boolean => {
    if (!task.updated_at) return false;
    const lastUpdated = new Date(task.updated_at);
    const today = new Date();
    return (
        lastUpdated.getDate() === today.getDate() &&
        lastUpdated.getMonth() === today.getMonth() &&
        lastUpdated.getFullYear() === today.getFullYear()
    );
};

export const getCurrentDayOfWeek = (): number => {
    const today = new Date();
    return today.getDay(); // 0 (Sunday) to 6 (Saturday)
};
