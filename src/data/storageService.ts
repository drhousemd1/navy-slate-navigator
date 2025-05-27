import { supabase } from '@/integrations/supabase/client';
import { FileOptions } from '@supabase/storage-js';

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
  filePath: string,
  file: File,
  options?: FileOptions
): Promise<{ path: string; publicUrl: string }> => {
  console.log(`[storageService] Uploading file '${filePath}' to bucket '${bucketName}'`);
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, options);

  if (error) {
    console.error(`[storageService] Error uploading file '${filePath}' to bucket '${bucketName}':`, error);
    throw error;
  }

  if (!data || !data.path) {
    console.error(`[storageService] Error uploading file to bucket '${bucketName}': No path returned.`);
    throw new Error('File upload failed: No path returned from storage.');
  }
  
  console.log(`[storageService] File '${data.path}' uploaded successfully to bucket '${bucketName}'.`);

  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);

  if (!urlData || !urlData.publicUrl) {
    console.error(`[storageService] Error getting public URL for '${data.path}' in bucket '${bucketName}'.`);
    // Note: The file is uploaded, but we couldn't get the public URL.
    // Depending on requirements, you might want to handle this differently,
    // e.g., by attempting to delete the uploaded file or returning a partial success.
    // For now, we'll throw, as the public URL is usually critical.
    throw new Error('File uploaded, but failed to retrieve public URL.');
  }
  
  console.log(`[storageService] Public URL for '${data.path}': ${urlData.publicUrl}`);
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
  filePaths: string[]
): Promise<void> => {
  if (filePaths.length === 0) {
    console.log('[storageService] No files specified for deletion.');
    return;
  }
  console.log(`[storageService] Deleting files from bucket '${bucketName}':`, filePaths);
  const { data, error } = await supabase.storage
    .from(bucketName)
    .remove(filePaths);

  if (error) {
    console.error(`[storageService] Error deleting files from bucket '${bucketName}':`, error);
    throw error;
  }
  
  console.log(`[storageService] Files deleted successfully from bucket '${bucketName}':`, data);
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
  filePath: string
): string => {
  console.log(`[storageService] Getting public URL for file '${filePath}' in bucket '${bucketName}'`);
  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  if (!data || !data.publicUrl) {
    console.error(`[storageService] Error retrieving public URL for '${filePath}' in bucket '${bucketName}'.`);
    throw new Error(`Failed to get public URL for ${filePath}.`);
  }
  
  console.log(`[storageService] Retrieved public URL: ${data.publicUrl}`);
  return data.publicUrl;
};
