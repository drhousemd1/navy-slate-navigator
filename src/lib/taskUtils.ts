import { endOfWeek, format, startOfWeek } from 'date-fns';

export const formatDate = (date: Date) => {
  return format(date, 'yyyy-MM-dd');
};

export const getWeekIdentifier = (date: Date): string => {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Start of week (Monday)
  const end = endOfWeek(date, { weekStartsOn: 1 });   // End of week (Sunday)

  const startFormatted = format(start, 'yyyy-MM-dd');
  const endFormatted = format(end, 'yyyy-MM-dd');

  return `${startFormatted}_${endFormatted}`;
};

export const currentWeekKey = (): string => {
  return getWeekIdentifier(new Date());
};

export const isDateInCurrentWeek = (date: Date): boolean => {
  return getWeekIdentifier(date) === currentWeekKey();
};

export const resetTaskCompletions = async (frequency: string) => {
  try {
    const response = await fetch('/api/reset-tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ frequency }),
    });

    if (!response.ok) {
      console.error('Failed to reset tasks:', response.status, response.statusText);
    } else {
      console.log('Tasks reset successfully');
    }
  } catch (error) {
    console.error('Error resetting tasks:', error);
  }
};

// Export the Task interface properly so it can be imported by other files
export interface Task { 
  id: string;
  title: string;
  points: number;
  completed: boolean;
  frequency: string;
  frequency_count: number;
  priority: 'low' | 'medium' | 'high';
  description?: string;
  icon_name?: string;
  icon_color?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  background_image_url?: string;
  background_opacity?: number;
  highlight_effect?: boolean;
  focal_point_x?: number;
  focal_point_y?: number;
  icon_url?: string;
  last_completed_date?: string;
  week_identifier?: string | null;
  created_at?: string;
  updated_at?: string;
  background_images?: string[]; // Make sure this is defined as string[] to match expected type
  usage_data?: number[];
  [key: string]: any; // For any additional properties
}
