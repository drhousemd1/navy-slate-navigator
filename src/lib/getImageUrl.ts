
import { supabase } from "@/integrations/supabase/client";

/**
 * Converts a storage path to a public URL using Supabase Storage
 * @param path The path of the image in Supabase storage, e.g., "backgrounds/image.jpg"
 * @param bucket The storage bucket name, defaults to "rules"
 * @param options Optional resizing and optimization options
 * @returns A public URL to the image or null if the path is not provided
 */
export function getPublicImageUrl(
  path: string | null, 
  bucket: string = "rules",
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'jpg' | 'png';
  }
): string | null {
  if (!path) return null;
  
  // Handle already formed URLs or base64 data
  if (path.startsWith("http") || path.startsWith("data:")) {
    return path;
  }
  
  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    
    if (!data?.publicUrl) return null;
    
    // If no optimization options provided, return the original URL
    if (!options) return data.publicUrl;
    
    // Add transformation parameters to the URL for Supabase image optimization
    // Note: This works if Supabase image optimization is enabled
    const url = new URL(data.publicUrl);
    
    if (options.width) url.searchParams.append('width', options.width.toString());
    if (options.height) url.searchParams.append('height', options.height.toString());
    if (options.quality) url.searchParams.append('quality', options.quality.toString());
    if (options.format) url.searchParams.append('format', options.format);
    
    return url.toString();
  } catch (error) {
    console.error("Error getting public URL for image:", error);
    return null;
  }
}
