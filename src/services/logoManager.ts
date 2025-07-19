
import { LOGO_CONFIG } from '@/config/logoConfig';
import { logger } from '@/lib/logger';
import { uploadFile, deleteFiles, getFilePublicUrl } from '@/data/storageService';

export class LogoManager {
  private static instance: LogoManager;
  
  public static getInstance(): LogoManager {
    if (!LogoManager.instance) {
      LogoManager.instance = new LogoManager();
    }
    return LogoManager.instance;
  }

  /**
   * Get the current logo URL from storage or fallback
   */
  public async getCurrentLogo(): Promise<string> {
    try {
      // Try to get the current logo from Supabase Storage
      const logoUrl = getFilePublicUrl(LOGO_CONFIG.bucketName, LOGO_CONFIG.currentLogoFileName);
      
      // Test if the logo exists by making a HEAD request
      const response = await fetch(logoUrl, { method: 'HEAD' });
      if (response.ok) {
        return logoUrl;
      }
    } catch (error) {
      logger.warn('Current logo not found in storage, using fallback');
    }
    
    return LOGO_CONFIG.fallbackLogoPath;
  }

  /**
   * Upload a new logo and replace the current one
   */
  public async uploadLogo(file: File): Promise<{ success: boolean; message: string; logoUrl?: string }> {
    try {
      logger.info('Starting logo upload', { fileName: file.name, fileSize: file.size });
      
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return { success: false, message: validation.error || 'Invalid file' };
      }

      // Get file extension to preserve format
      const fileExtension = this.getFileExtension(file.name);
      const fileName = `${LOGO_CONFIG.currentLogoFileName}${fileExtension}`;
      
      try {
        // Delete existing logo first (ignore errors if it doesn't exist)
        await deleteFiles(LOGO_CONFIG.bucketName, [LOGO_CONFIG.currentLogoFileName + '.png', LOGO_CONFIG.currentLogoFileName + '.jpg', LOGO_CONFIG.currentLogoFileName + '.jpeg', LOGO_CONFIG.currentLogoFileName + '.svg', LOGO_CONFIG.currentLogoFileName + '.webp']);
      } catch (error) {
        // Ignore deletion errors - file might not exist
        logger.debug('No existing logo to delete');
      }
      
      // Upload new logo
      const result = await uploadFile(
        LOGO_CONFIG.bucketName,
        fileName,
        file,
        {
          cacheControl: '3600',
          upsert: true
        }
      );
      
      logger.info('Logo uploaded successfully', { 
        fileName,
        publicUrl: result.publicUrl 
      });
      
      return { 
        success: true, 
        message: 'Logo uploaded successfully', 
        logoUrl: result.publicUrl
      };
      
    } catch (error) {
      logger.error('Failed to upload logo', { error, fileName: file.name });
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to upload logo' 
      };
    }
  }

  /**
   * Get fallback logo URL
   */
  public getFallbackLogo(): string {
    return LOGO_CONFIG.fallbackLogoPath;
  }

  /**
   * Check if a logo exists in storage
   */
  public async checkLogoExists(): Promise<boolean> {
    try {
      const logoUrl = await this.getCurrentLogo();
      return logoUrl !== LOGO_CONFIG.fallbackLogoPath;
    } catch (error) {
      logger.error('Failed to check logo existence', { error });
      return false;
    }
  }

  private validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > LOGO_CONFIG.maxFileSize) {
      return { 
        valid: false, 
        error: `File size must be less than ${LOGO_CONFIG.maxFileSize / (1024 * 1024)}MB` 
      };
    }

    // Check file type
    if (!LOGO_CONFIG.allowedFormats.includes(file.type as any)) {
      return { 
        valid: false, 
        error: 'Only PNG, JPEG, SVG, and WebP files are allowed' 
      };
    }

    // Check file extension
    const extension = this.getFileExtension(file.name);
    if (!LOGO_CONFIG.allowedExtensions.includes(extension)) {
      return { 
        valid: false, 
        error: 'Only .png, .jpg, .jpeg, .svg, and .webp files are allowed' 
      };
    }

    return { valid: true };
  }

  private getFileExtension(fileName: string): string {
    return '.' + fileName.split('.').pop()?.toLowerCase();
  }
}

// Export singleton instance
export const logoManager = LogoManager.getInstance();
