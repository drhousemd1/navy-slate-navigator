
import { useState, useCallback } from 'react';
import { logoManager } from '@/services/logoManager';
import { uploadLogo, validateLogoFile } from '@/utils/logoUpload';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface UseLogoManagerReturn {
  isUploading: boolean;
  uploadProgress: number;
  
  // Actions
  handleLogoUpload: (file: File) => Promise<void>;
  checkLogoExists: () => Promise<boolean>;
  refreshLogo: () => void;
}

export const useLogoManager = (): UseLogoManagerReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();

  const handleLogoUpload = useCallback(async (file: File) => {
    // Validate file first
    const validation = validateLogoFile(file);
    if (!validation.valid) {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: validation.error || "Please select a valid image file"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadLogo(file, {
        onProgress: (progress) => {
          setUploadProgress(progress);
        },
        onSuccess: (logoUrl) => {
          toast({
            title: "Logo Updated",
            description: "Your logo has been successfully updated"
          });
          logger.info('Logo upload successful', { logoUrl });
          // Trigger a refresh of the logo display
          setRefreshKey(prev => prev + 1);
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Upload Failed",
            description: error
          });
          logger.error('Logo upload failed', { error });
        }
      });

      if (!result.success) {
        throw new Error(result.message);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast({
        variant: "destructive",
        title: "Upload Error",
        description: errorMessage
      });
      logger.error('Logo upload error', { error });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [toast]);

  const checkLogoExists = useCallback(async (): Promise<boolean> => {
    try {
      return await logoManager.checkLogoExists();
    } catch (error) {
      logger.error('Failed to check logo existence', { error });
      return false;
    }
  }, []);

  const refreshLogo = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return {
    isUploading,
    uploadProgress,
    
    handleLogoUpload,
    checkLogoExists,
    refreshLogo
  };
};
