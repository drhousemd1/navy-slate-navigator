
import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface ImageHandlingResult {
  imagePreview: string | null;
  imageFile: File | null;
  handleImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  triggerImageUpload: () => void;
  removeImage: () => void;
  uploadImageToServer: (file: File) => Promise<string | null>; // Simulates server upload
  setImageFile: React.Dispatch<React.SetStateAction<File | null>>;
  setImagePreview: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useModalImageHandling = (
  initialImageUrl?: string | null,
  onImageUploadSuccess?: (url: string) => void, // Callback when server upload succeeds
  onImageRemoveSuccess?: () => void // Callback when image is removed (from server ideally)
): ImageHandlingResult => {
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl || null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleImageSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "File Too Large", description: "Please select an image smaller than 5MB.", variant: "destructive" });
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        toast({ title: "Invalid File Type", description: "Please select a JPG, PNG, GIF or WEBP image.", variant: "destructive" });
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      logger.log("Image selected for preview:", file.name);
    }
  }, []);

  const triggerImageUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/gif,image/webp';
    input.onchange = (event) => {
      // The event target needs to be cast to HTMLInputElement
      const target = event.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        // Create a synthetic event or pass the file directly
        // For simplicity, let's just re-use handleImageSelect logic by creating a minimal event-like structure.
        // This is a bit of a workaround because handleImageSelect expects a ChangeEvent.
        // A cleaner way might be to have a separate function that takes a File object.
        const pseudoEvent = { target: { files: target.files } } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleImageSelect(pseudoEvent);
      }
    };
    input.click();
  }, [handleImageSelect]);

  const removeImage = useCallback(async () => {
    // Here, you might also call a function to delete the image from the server
    // For now, it just clears local state.
    // Example: await deleteImageFromServer(initialImageUrl);
    setImagePreview(null);
    setImageFile(null);
    if (onImageRemoveSuccess) {
      onImageRemoveSuccess();
    }
    toast({ title: "Image Removed", description: "The image has been cleared." });
    logger.log("Image removed.");
  }, [onImageRemoveSuccess]);

  // Simulate uploading the image to a server (e.g., Supabase Storage)
  const uploadImageToServer = useCallback(async (fileToUpload: File): Promise<string | null> => {
    if (!fileToUpload) {
      logger.warn("No image file provided to uploadImageToServer.");
      return null;
    }
    logger.log("Simulating uploadImageToServer for file:", fileToUpload.name);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In a real app, this would involve:
    // 1. Getting a Supabase client instance.
    // 2. Using `supabase.storage.from('bucket-name').upload(filePath, file)`.
    // 3. Getting the public URL: `supabase.storage.from('bucket-name').getPublicUrl(filePath)`.
    
    // For this hook, we'll just simulate a success and return a placeholder URL.
    const simulatedPublicUrl = `https://example.com/uploads/${Date.now()}-${fileToUpload.name}`;
    logger.log("Simulated server upload successful. URL:", simulatedPublicUrl);
    
    if (onImageUploadSuccess) {
      onImageUploadSuccess(simulatedPublicUrl);
    }
    // The component using this hook would typically update its form state with this URL.
    // This hook itself doesn't set the preview to the *server* URL directly,
    // as the preview is usually already showing the base64 version.
    // The calling component decides how to use this URL.
    return simulatedPublicUrl;
  }, [onImageUploadSuccess]);

  return {
    imagePreview,
    imageFile,
    handleImageSelect,
    triggerImageUpload,
    removeImage,
    uploadImageToServer,
    setImageFile, // Expose setter if external control is needed
    setImagePreview, // Expose setter
  };
};
