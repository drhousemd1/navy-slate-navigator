
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getMondayBasedDay } from "./utils";

export interface Task {
  id: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
  background_image_url?: string;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  frequency?: "daily" | "weekly";
  frequency_count?: number;
  icon_url?: string;
  icon_name?: string;
  priority?: "low" | "medium" | "high";
  completion_count?: number;
  max_completions?: number;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  highlight_effect?: boolean;
  icon_color?: string;
  last_completed_date?: string;
  usage_data?: number[];
  created_at?: string;
}

export const getLocalDateString = (): string => {
  const today = new Date();
  return today.toLocaleDateString("en-CA");
};

export const wasCompletedToday = (task: Task): boolean => {
  return task.last_completed_date === getLocalDateString();
};

export const getCurrentDayOfWeek = (): number => {
  return getMondayBasedDay();
};

export const canCompleteTask = (task: Task): boolean => {
  if (!task.frequency_count) {
    return !task.completed;
  }

  const todayIndex = getCurrentDayOfWeek();
  const todayCompletions = task.usage_data?.[todayIndex] || 0;

  return todayCompletions < (task.frequency_count || 1);
};

const initializeUsageDataArray = (task: Task): number[] => {
  return task.usage_data || Array(7).fill(0);
};

export const fetchTasks = async (): Promise<Task[]> => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching tasks:", error);
      toast({
        title: "Error fetching tasks",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }

    const processedTasks = (data || []).map((task: Task) => {
      const usage_data = initializeUsageDataArray(task);
      const isToday = wasCompletedToday(task);
      return {
        ...task,
        usage_data,
        completed:
          task.frequency === "daily" && !isToday ? false : task.completed,
      };
    });

    return processedTasks;
  } catch (err) {
    console.error("Unhandled fetch error:", err);
    return [];
  }
};
