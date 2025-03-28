
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useImageUpload = () => {
  const { user } = useAuth();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Upload image to Supabase storage
  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) {
      toast({
        title: "Authentication error",
        description: "You must be logged in to upload images",
        variant: "destructive"
      });
      return null;
    }
    
    if (!file) {
      console.error('No file provided for upload');
      return null;
    }
    
    setIsUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      console.log('Uploading image:', filePath, 'File size:', file.size);
      
      const { error: uploadError, data } = await supabase.storage
        .from('message_images')
        .upload(filePath, file);
      
      if (uploadError) {
        console.error('Upload error details:', uploadError);
        toast({
          title: "Upload failed",
          description: uploadError.message,
          variant: "destructive"
        });
        return null;
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('message_images')
        .getPublicUrl(filePath);
      
      console.log('Image uploaded successfully:', publicUrl);
      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error uploading image",
        description: error.message || "Could not upload the image. Please try again.",
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
        // Clean up handled in component
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
