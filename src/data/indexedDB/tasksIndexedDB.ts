
import { db } from './db';
import { Task } from '@/data/tasks/types';
import { getLastSyncTime, setLastSyncTime } from './common';

const TASKS_ENTITY_NAME = 'tasks';

export const loadTasksFromDB = async (): Promise<Task[] | null> => {
  try {
    const tasks = await db.tasks.toArray();
    return tasks.length > 0 ? tasks : null;
  } catch (error) {
    console.error("Error loading tasks from IndexedDB:", error);
    return null;
  }
};

export const saveTasksToDB = async (tasks: Task[]): Promise<void> => {
  try {
    await db.transaction('rw', db.tasks, async () => {
      await db.tasks.clear(); // Clear existing tasks before saving new set
      await db.tasks.bulkAdd(tasks);
    });
  } catch (error) {
    console.error("Error saving tasks to IndexedDB:", error);
  }
};

export const getTaskByIdFromDB = async (id: string): Promise<Task | null> => {
  try {
    const task = await db.tasks.get(id);
    return task || null;
  } catch (error) {
    console.error(`Error getting task ${id} from IndexedDB:`, error);
    return null;
  }
};

export const addTaskToDB = async (task: Task): Promise<void> => {
  try {
    await db.tasks.add(task);
  } catch (error) {
    console.error("Error adding task to IndexedDB:", error);
  }
};

export const updateTaskInDB = async (task: Task): Promise<void> => {
  try {
    await db.tasks.put(task); // put handles both add and update
  } catch (error) {
    console.error("Error updating task in IndexedDB:", error);
  }
};

export const deleteTaskFromDB = async (id: string): Promise<void> => {
  try {
    await db.tasks.delete(id);
  } catch (error) {
    console.error("Error deleting task from IndexedDB:", error);
  }
};

export const getLastSyncTimeForTasks = (): Promise<string | null> => {
  return getLastSyncTime(TASKS_ENTITY_NAME);
};

export const setLastSyncTimeForTasks = (timestamp: string): Promise<void> => {
  return setLastSyncTime(TASKS_ENTITY_NAME, timestamp);
};
