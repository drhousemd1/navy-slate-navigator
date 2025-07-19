
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
 * Validate logo file before upload - supports all major image formats
 */
export const validateLogoFile = (file: File): { valid: boolean; error?: string } => {
  // Check if file exists
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  // Check file type - support all major image formats
  const supportedTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!supportedTypes.some(type => file.type.includes(type.split('/')[1]))) {
    return { valid: false, error: 'Only SVG, PNG, JPEG, and WebP files are supported' };
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }

  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!['svg', 'png', 'jpg', 'jpeg', 'webp'].includes(extension || '')) {
    return { valid: false, error: 'File must have .svg, .png, .jpg, .jpeg, or .webp extension' };
  }

  return { valid: true };
};

/**
 * Create a file input element for logo upload - supports all image formats
 */
export const createLogoFileInput = (
  onFileSelect: (file: File) => void
): HTMLInputElement => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp';
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
