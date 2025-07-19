
import { logoManager } from '@/services/logoManager';
import { logger } from '@/lib/logger';

export interface LogoUploadOptions {
  onProgress?: (progress: number) => void;
  onSuccess?: (logoUrl: string) => void;
  onError?: (error: string) => void;
}

/**
 * Upload a logo file with progress tracking and error handling
 */
export const uploadLogo = async (
  file: File,
  options: LogoUploadOptions = {}
): Promise<{ success: boolean; message: string; logoUrl?: string }> => {
  const { onProgress, onSuccess, onError } = options;

  try {
    // Start progress
    onProgress?.(0);
    
    // Upload logo using the logo manager
    onProgress?.(50);
    
    const result = await logoManager.uploadLogo(file);
    
    onProgress?.(100);
    
    if (result.success && result.logoUrl) {
      onSuccess?.(result.logoUrl);
      logger.info('Logo upload completed successfully');
    } else {
      onError?.(result.message);
      logger.error('Logo upload failed', { message: result.message });
    }
    
    return result;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    onError?.(errorMessage);
    logger.error('Logo upload error', { error });
    
    return {
      success: false,
      message: errorMessage
    };
  }
};

/**
 * Validate logo file before upload
 */
export const validateLogoFile = (file: File): { valid: boolean; error?: string } => {
  // Check if file exists
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  // Check file type - now supports all common image formats
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only PNG, JPEG, SVG, and WebP files are supported' };
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }

  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
  if (!extension || !allowedExtensions.includes(extension)) {
    return { valid: false, error: 'File must have a valid image extension (.png, .jpg, .jpeg, .svg, .webp)' };
  }

  return { valid: true };
};

/**
 * Create a file input element for logo upload
 */
export const createLogoFileInput = (
  onFileSelect: (file: File) => void
): HTMLInputElement => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.png,.jpg,.jpeg,.svg,.webp,image/png,image/jpeg,image/svg+xml,image/webp';
  input.style.display = 'none';
  
  input.addEventListener('change', (event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      const validation = validateLogoFile(file);
      if (validation.valid) {
        onFileSelect(file);
      } else {
        logger.error('Invalid file selected', { error: validation.error });
        alert(validation.error || 'Invalid file selected');
      }
    }
  });
  
  return input;
};
