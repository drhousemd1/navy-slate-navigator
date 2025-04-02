
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/contexts/auth/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useImageUpload = () => {
  const { user } = useAuth();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Upload image to Supabase storage
  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    
    setIsUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${uuidv4()}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      console.log('Uploading image:', filePath);
      
      const { error: uploadError, data } = await supabase.storage
        .from('message_images')
        .upload(filePath, file);
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('message_images')
        .getPublicUrl(filePath);
      
      console.log('Image uploaded successfully:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error uploading image",
        description: "Could not upload the image. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (imageFile) {
        // No need to revoke object URLs here as we do it in the component
      }
    };
  }, [imageFile]);

  return {
    imageFile,
    setImageFile,
    isUploading,
    uploadImage
  };
};
