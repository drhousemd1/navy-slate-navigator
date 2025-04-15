
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads an image to Supabase storage and returns the storage path
 * @param imageBase64 Base64 encoded image data
 * @param folder Folder name within the bucket (default: 'backgrounds')
 * @param bucket Bucket name (default: 'rules')
 * @returns The storage path if successful, or null if failed
 */
export async function uploadImageToStorage(
  imageBase64: string,
  folder: string = 'backgrounds',
  bucket: string = 'rules'
): Promise<string | null> {
  try {
    // Skip if not a base64 image
    if (!imageBase64.startsWith('data:image')) {
      console.log('Not a base64 image, skipping upload');
      return null;
    }
    
    // Extract file type and data
    const fileTypeMatch = imageBase64.match(/data:image\/(\w+);/);
    const fileType = fileTypeMatch ? fileTypeMatch[1] : 'jpeg';
    
    // Create a unique file path
    const fileName = `${uuidv4()}.${fileType}`;
    const filePath = `${folder}/${fileName}`;
    
    // Convert base64 to blob
    const base64Data = imageBase64.split(',')[1];
    const blob = await fetch(`data:image/${fileType};base64,${base64Data}`).then(res => res.blob());
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, blob, {
        contentType: `image/${fileType}`,
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading image to storage:', error);
      return null;
    }
    
    console.log('Image uploaded successfully, path:', data.path);
    return data.path;
  } catch (error) {
    console.error('Exception during image upload:', error);
    return null;
  }
}
