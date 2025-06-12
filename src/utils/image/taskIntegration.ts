import { TaskFormValues, CreateTaskVariables, UpdateTaskVariables } from '@/data/tasks/types';
import { logger } from '@/lib/logger';

/**
 * Converts TaskFormValues with image_meta to legacy format for database storage
 */
export function taskDataToLegacyFormat(formData: TaskFormValues): Omit<TaskFormValues, 'image_meta'> {
  const { image_meta, ...legacyData } = formData;
  
  // Keep the existing background_image_url for backward compatibility
  // The image_meta will be stored separately in the database
  logger.debug('[Task Integration] Converting task data to legacy format', {
    hasImageMeta: !!image_meta,
    backgroundImageUrl: legacyData.background_image_url
  });
  
  return legacyData;
}

/**
 * Converts CreateTaskVariables with image_meta for safe database insertion
 */
export function createTaskDataToLegacyFormat(data: CreateTaskVariables): Omit<CreateTaskVariables, 'image_meta'> & { image_meta?: any } {
  const { image_meta, ...legacyData } = data;
  
  return {
    ...legacyData,
    image_meta: image_meta || null
  };
}

/**
 * Converts UpdateTaskVariables with image_meta for safe database updates
 */
export function updateTaskDataToLegacyFormat(data: UpdateTaskVariables): Omit<UpdateTaskVariables, 'image_meta'> & { image_meta?: any } {
  const { image_meta, ...legacyData } = data;
  
  return {
    ...legacyData,
    image_meta: image_meta || null
  };
}
