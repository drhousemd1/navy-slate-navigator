import { Task } from '@/lib/taskUtils'; // Assuming Task is well-defined here

// Local type to ensure 'id' is present for the generic hook's TItem constraint
export type TaskWithId = Task & { id: string };

// Define variables for creating a task
// Title and points are required, others can be optional or have defaults
// We explicitly list fields that might not be picked up correctly by Partial<Omit<Task,...>>
// or to make their presence clearer.
export type CreateTaskVariables = Partial<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed' | 'last_completed_date' | 'title' | 'points'>> & {
  title: string;
  points: number;
  // Explicitly add fields that were causing type errors, ensuring they are optional
  week_identifier?: string | null;
  background_images?: any; // Ideally, replace 'any' with a more specific type like JsonValue if available
  carousel_timer?: number | null;
  // Other fields like description, frequency, icon_name, etc.,
  // are expected to be covered by Partial<Omit<Task, ...>> if they are part of the Task type
  // and not among the omitted/required ones.
};

// Define variables for updating a task
export type UpdateTaskVariables = { id: string } & Partial<Omit<Task, 'id'>>;
