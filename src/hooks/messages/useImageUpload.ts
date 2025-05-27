
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useImageUpload = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!file || !user) return null;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('message_images')
        .upload(`${user.id}/${fileName}`, file);
      
      if (error) {
        console.error('Error uploading image:', error);
        throw error;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('message_images')
        .getPublicUrl(`${user.id}/${fileName}`);
      
      return publicUrl;
    } catch (err) {
      console.error('Error in uploadImage:', err);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    imageFile,
    setImageFile,
    isUploading,
    uploadImage,
  };
};
