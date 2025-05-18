
import { Task } from '@/lib/taskUtils'; // Assuming Task is well-defined here

// Local type to ensure 'id' is present for the generic hook's TItem constraint
export type TaskWithId = Task & { id: string };

// Define variables for creating a task
// Title and points are required, others can be optional or have defaults
export type CreateTaskVariables = Partial<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed' | 'last_completed_date'>> & {
  title: string;
  points: number;
};

// Define variables for updating a task
export type UpdateTaskVariables = { id: string } & Partial<Omit<Task, 'id'>>;

