
import { Json } from './database.types';

export type Priority = 'low' | 'medium' | 'high';
export type Frequency = 'daily' | 'weekly';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  points: number;
  priority: Priority;
  frequency: Frequency;
  frequency_count: number;
  completed: boolean;
  last_completed_date: string | null;
  usage_data: Json | null;
  title_color: string | null;
  description_color: string | null;
  highlight_effect: boolean;
  icon_name: string | null;
  icon_color: string | null;
}

export interface TaskCompletion {
  id: string;
  task_id: string;
  user_id: string;
  completed_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  image_url?: string | null;
  points?: number;
  priority?: Priority;
  frequency?: Frequency;
  frequency_count?: number;
  title_color?: string;
  description_color?: string;
  highlight_effect?: boolean;
  icon_name?: string;
  icon_color?: string;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  id: string;
  completed?: boolean;
  last_completed_date?: string | null;
  usage_data?: Json | null;
}
