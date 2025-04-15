
import { supabase } from "@/integrations/supabase/client";

/**
 * Converts a storage path to a public URL using Supabase Storage
 * @param path The path of the image in Supabase storage, e.g., "backgrounds/image.jpg"
 * @param bucket The storage bucket name, defaults to "rules"
 * @returns A public URL to the image or null if the path is not provided
 */
export function getPublicImageUrl(path: string | null, bucket: string = "rules"): string | null {
  if (!path) return null;
  
  // Handle already formed URLs or base64 data
  if (path.startsWith("http") || path.startsWith("data:")) {
    return path;
  }
  
  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || null;
  } catch (error) {
    console.error("Error getting public URL for image:", error);
    return null;
  }
}
