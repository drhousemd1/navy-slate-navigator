import { useState, useCallback } from 'react';
import { logoManager } from '@/services/logoManager';
import { uploadLogo, validateLogoFile } from '@/utils/logoUpload';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface UseLogoManagerReturn {
  isUploading: boolean;
  uploadProgress: number;
  currentLogoUrl: string;
  archivedLogos: string[];
  
  // Actions
  handleLogoUpload: (file: File) => Promise<void>;
  revertToArchive: (timestamp: string) => Promise<void>;
  refreshArchivedLogos: () => Promise<void>;
  checkLogoExists: () => Promise<boolean>;
}

export const useLogoManager = (): UseLogoManagerReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [archivedLogos, setArchivedLogos] = useState<string[]>([]);
  const { toast } = useToast();

  const currentLogoUrl = logoManager.getCurrentLogo();

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

  const revertToArchive = useCallback(async (timestamp: string) => {
    try {
      const result = await logoManager.revertToArchive(timestamp);
      
      if (result.success) {
        toast({
          title: "Logo Reverted",
          description: "Successfully reverted to previous logo"
        });
        logger.info('Logo reverted successfully', { timestamp });
      } else {
        throw new Error(result.message);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Revert failed';
      toast({
        variant: "destructive",
        title: "Revert Failed",
        description: errorMessage
      });
      logger.error('Logo revert failed', { error, timestamp });
    }
  }, [toast]);

  const refreshArchivedLogos = useCallback(async () => {
    try {
      const archived = await logoManager.getArchivedLogos();
      setArchivedLogos(archived);
      logger.info('Archived logos refreshed', { count: archived.length });
    } catch (error) {
      logger.error('Failed to refresh archived logos', { error });
    }
  }, []);

  const checkLogoExists = useCallback(async (): Promise<boolean> => {
    try {
      return await logoManager.checkLogoExists();
    } catch (error) {
      logger.error('Failed to check logo existence', { error });
      return false;
    }
  }, []);

  return {
    isUploading,
    uploadProgress,
    currentLogoUrl,
    archivedLogos,
    
    handleLogoUpload,
    revertToArchive,
    refreshArchivedLogos,
    checkLogoExists
  };
};