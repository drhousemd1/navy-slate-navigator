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
 * Validate logo file before upload - updated to support PNG
 */
export const validateLogoFile = (file: File): { valid: boolean; error?: string } => {
  // Check if file exists
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  // Check file type - updated to support PNG and JPEG
  if (!file.type.includes('svg') && !file.type.includes('png') && !file.type.includes('jpeg')) {
    return { valid: false, error: 'Only SVG, PNG, and JPEG files are supported' };
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 5MB' };
  }

  // Check file extension - updated to support PNG and JPEG
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!['svg', 'png', 'jpg', 'jpeg'].includes(extension || '')) {
    return { valid: false, error: 'File must have .svg, .png, .jpg, or .jpeg extension' };
  }

  return { valid: true };
};

/**
 * Create a file input element for logo upload - updated accept attribute
 */
export const createLogoFileInput = (
  onFileSelect: (file: File) => void
): HTMLInputElement => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg';
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
