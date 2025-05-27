import { RawSupabaseTask, TaskWithId, Json } from '@/data/tasks/types';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/errors';
import { logger } from './logger';

export const DEFAULT_TASK_VALUES: Partial<TaskWithId> = {
  title_color: '#FFFFFF',
  subtext_color: '#8E9196',
  calendar_color: '#7E69AB',
  icon_color: '#9b87f5',
  background_opacity: 100,
  highlight_effect: false,
  focal_point_x: 50,
  focal_point_y: 50,
};

const defaultUsageData: number[] = Array(7).fill(0);

// Helper to safely parse JSON data, especially for usage_data
function parseJsonData<T>(jsonData: Json | null | undefined, defaultValue: T): T {
  if (jsonData === null || jsonData === undefined) {
    return defaultValue;
  }
  try {
    // If it's already an array/object (parsed by Supabase client), return it
    if (typeof jsonData === 'object') {
      return jsonData as T;
    }
    // If it's a string, try to parse it
    if (typeof jsonData === 'string') {
      return JSON.parse(jsonData) as T;
    }
    // Fallback for unexpected types
    logger.warn('[parseJsonData] Unexpected data type for JSON parsing:', typeof jsonData, jsonData);
    return defaultValue;
  } catch (error: unknown) {
    logger.error('[parseJsonData] Error parsing JSON data:', getErrorMessage(error), jsonData, error);
    return defaultValue;
  }
}

export const getWeekIdentifier = (date: Date): string => {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDays = (date.getTime() - startOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${weekNumber < 10 ? '0' : ''}${weekNumber}`;
};

export interface Task {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description?: string | null;
  points: number;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  last_completed_date?: string | null;
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  icon_name?: string | null;
  icon_color: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  background_image_url?: string | null;
  background_opacity: number;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  week_identifier?: string | null;
  icon_url?: string | null;
  usage_data?: number[] | null;
  background_images?: Json | null;
}

export const parseTaskData = (rawTask: RawSupabaseTask): TaskWithId => {
  // Ensure all fields from RawSupabaseTask are mapped to TaskWithId
  // especially for colors and optional fields.

  const parsed: TaskWithId = {
    id: rawTask.id,
    created_at: rawTask.created_at,
    updated_at: rawTask.updated_at,
    title: rawTask.title,
    description: rawTask.description ?? null,
    points: rawTask.points,
    priority: (rawTask.priority as 'low' | 'medium' | 'high') || 'medium',
    completed: rawTask.completed ?? false,
    last_completed_date: rawTask.last_completed_date ?? null,
    frequency: (rawTask.frequency as 'daily' | 'weekly') || 'daily',
    frequency_count: rawTask.frequency_count ?? 1,
    icon_name: rawTask.icon_name ?? null,
    icon_color: rawTask.icon_color || '#9b87f5',
    title_color: rawTask.title_color || '#FFFFFF',
    subtext_color: rawTask.subtext_color || '#8E9196',
    calendar_color: rawTask.calendar_color || '#7E69AB',
    background_image_url: rawTask.background_image_url ?? null,
    background_opacity: rawTask.background_opacity ?? 100,
    highlight_effect: rawTask.highlight_effect ?? false,
    focal_point_x: rawTask.focal_point_x ?? 50,
    focal_point_y: rawTask.focal_point_y ?? 50,
    week_identifier: rawTask.week_identifier ?? getWeekIdentifier(new Date(rawTask.created_at)),
    usage_data: parseJsonData(rawTask.usage_data, defaultUsageData),
    background_images: rawTask.background_images ?? null, // Assuming it's already JSON or null
    icon_url: rawTask.icon_url ?? null,
  };
  return parsed;
};

export const isTaskDueToday = (task: TaskWithId): boolean => {
  if (!task) return false;

  const today = new Date();
  const lastCompletedDate = task.last_completed_date ? new Date(task.last_completed_date) : null;

  if (task.frequency === 'daily') {
    if (!lastCompletedDate) return true;
    const timeDiff = today.getTime() - lastCompletedDate.getTime();
    const dayDiff = timeDiff / (1000 * 3600 * 24);
    return dayDiff >= task.frequency_count;
  }

  if (task.frequency === 'weekly' && task.week_identifier) {
    const currentWeekIdentifier = getWeekIdentifier(today);
    return task.week_identifier !== currentWeekIdentifier;
  }

  return false;
};
