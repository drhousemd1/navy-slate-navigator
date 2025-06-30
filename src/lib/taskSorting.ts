
import { TaskWithId } from '@/data/tasks/types';

/**
 * Sorts tasks by priority (high -> medium -> low) and then by creation date (newest first)
 */
export const sortTasksByPriorityAndDate = (tasks: TaskWithId[]): TaskWithId[] => {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  
  return [...tasks].sort((a, b) => {
    // First sort by priority
    const priorityA = priorityOrder[a.priority] ?? 1; // Default to medium if invalid
    const priorityB = priorityOrder[b.priority] ?? 1;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Within same priority, sort by creation date (newest first)
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    
    return dateB - dateA;
  });
};
