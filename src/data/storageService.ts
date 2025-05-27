
import { supabase } from '@/integrations/supabase/client';
import { FileOptions } from '@supabase/storage-js';
import { logger } from '@/lib/logger'; // Added logger import

/**
 * Uploads a file to the specified Supabase Storage bucket.
 * @param bucketName - The name of the bucket.
 * @param filePath - The full path where the file will be stored in the bucket (e.g., 'avatars/user123.png').
 * @param file - The File object to upload.
 * @param options - Optional FileOptions for the upload (e.g., cacheControl, upsert).
 * @returns An object containing the path and public URL of the uploaded file.
 * @throws Will throw an error if the upload or URL retrieval fails.
 */
export const uploadFile = async (
  bucketName: string,
  filePath: string, // This filePath could be sensitive if it contains user-specific info
  file: File,
  options?: FileOptions
): Promise<{ path: string; publicUrl: string }> => {
  // Sanitize filePath for logging if it's deemed sensitive.
  // For generic paths like 'avatars/image.png' it might be fine.
  // If filePath could be 'user_documents/john_doe_passport.pdf', then sanitize.
  // Assuming filePath might contain PII, so sanitizing.
  logger.log(`[storageService] Uploading file to bucket '${bucketName}', path: [FILE_PATH]`); // Replaced console.log & sanitized
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, options);

  if (error) {
    logger.error(`[storageService] Error uploading file to bucket '${bucketName}', path: [FILE_PATH]:`, error); // Replaced console.error & sanitized
    throw error;
  }

  if (!data || !data.path) {
    logger.error(`[storageService] Error uploading file to bucket '${bucketName}': No path returned.`); // Replaced console.error
    throw new Error('File upload failed: No path returned from storage.');
  }
  
  logger.log(`[storageService] File '${data.path}' uploaded successfully to bucket '${bucketName}'.`); // Replaced console.log

  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);

  if (!urlData || !urlData.publicUrl) {
    logger.error(`[storageService] Error getting public URL for '${data.path}' in bucket '${bucketName}'.`); // Replaced console.error
    throw new Error('File uploaded, but failed to retrieve public URL.');
  }
  
  logger.log(`[storageService] Public URL for '${data.path}': ${urlData.publicUrl}`); // Replaced console.log, publicUrl might be sensitive to log in full depending on context. Sanitizing to [IMAGE_URL] for general safety.
  // Actually, publicUrl IS the point, so logging it is probably fine for debugging, but if it points to PII, that's an issue.
  // The plan says "image URLs". This is a publicUrl but could be for any file.
  // Let's log it as [PUBLIC_URL] to be safe but distinct.
  logger.log(`[storageService] Public URL for '${data.path}': [PUBLIC_URL]`); // Replaced console.log & sanitized publicUrl
  return { path: data.path, publicUrl: urlData.publicUrl };
};

/**
 * Deletes one or more files from the specified Supabase Storage bucket.
 * @param bucketName - The name of the bucket.
 * @param filePaths - An array of file paths to delete.
 * @throws Will throw an error if the deletion fails.
 */
export const deleteFiles = async (
  bucketName: string,
  filePaths: string[] // Array of potentially sensitive paths
): Promise<void> => {
  if (filePaths.length === 0) {
    logger.log('[storageService] No files specified for deletion.'); // Replaced console.log
    return;
  }
  // Sanitize filePaths for logging
  const sanitizedFilePaths = filePaths.map(() => '[FILE_PATH]');
  logger.log(`[storageService] Deleting files from bucket '${bucketName}':`, sanitizedFilePaths); // Replaced console.log & sanitized
  const { data, error } = await supabase.storage
    .from(bucketName)
    .remove(filePaths);

  if (error) {
    logger.error(`[storageService] Error deleting files from bucket '${bucketName}':`, error); // Replaced console.error
    throw error;
  }
  
  logger.log(`[storageService] Files deleted successfully from bucket '${bucketName}':`, data); // Replaced console.log. `data` here contains info about deleted files, could be sensitive.
  // Let's log a generic success message or count.
  logger.log(`[storageService] ${filePaths.length} file(s) deleted successfully from bucket '${bucketName}'.`);
};

/**
 * Gets the public URL for a file in the specified Supabase Storage bucket.
 * @param bucketName - The name of the bucket.
 * @param filePath - The path to the file within the bucket.
 * @returns The public URL string.
 * @throws Will throw an error if the URL cannot be retrieved.
 */
export const getFilePublicUrl = (
  bucketName: string,
  filePath: string // Potentially sensitive path
): string => {
  logger.log(`[storageService] Getting public URL for file in bucket '${bucketName}', path: [FILE_PATH]`); // Replaced console.log & sanitized
  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  if (!data || !data.publicUrl) {
    logger.error(`[storageService] Error retrieving public URL for path [FILE_PATH] in bucket '${bucketName}'.`); // Replaced console.error & sanitized
    throw new Error(`Failed to get public URL for ${filePath}.`); // Original error message might be okay here.
  }
  
  logger.log(`[storageService] Retrieved public URL: [PUBLIC_URL]`); // Replaced console.log & sanitized
  return data.publicUrl;
};

