
import { LOGO_CONFIG } from '@/config/logoConfig';
import { uploadFile, deleteFiles, getFilePublicUrl } from '@/data/storageService';
import { logger } from '@/lib/logger';

export class LogoManager {
  private static instance: LogoManager;
  private currentLogoUrl: string | null = null;
  
  public static getInstance(): LogoManager {
    if (!LogoManager.instance) {
      LogoManager.instance = new LogoManager();
    }
    return LogoManager.instance;
  }

  /**
   * Get the current logo URL from storage
   */
  public getCurrentLogo(): string {
    if (this.currentLogoUrl) {
      return this.currentLogoUrl;
    }
    return LOGO_CONFIG.fallbackLogoPath;
  }

  /**
   * Upload a new logo to Supabase Storage
   */
  public async uploadLogo(file: File): Promise<{ success: boolean; message: string; logoUrl?: string }> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return { success: false, message: validation.error || 'Invalid file' };
      }

      // Generate unique filename
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const fileName = `logo_${timestamp}.${extension}`;
      const filePath = `current/${fileName}`;

      // Upload to Supabase Storage
      const uploadResult = await uploadFile('logos', filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

      // Set as current logo
      this.currentLogoUrl = uploadResult.publicUrl;
      
      logger.info('Logo uploaded successfully', { 
        fileName, 
        publicUrl: uploadResult.publicUrl 
      });
      
      return { 
        success: true, 
        message: 'Logo uploaded successfully', 
        logoUrl: uploadResult.publicUrl
      };
      
    } catch (error) {
      logger.error('Failed to upload logo', { error });
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to upload logo' 
      };
    }
  }

  /**
   * Load current logo from storage
   */
  public async loadCurrentLogo(): Promise<void> {
    try {
      // Try to get the current logo from storage
      const logoUrl = getFilePublicUrl('logos', 'current/logo.png');
      
      // Test if the logo exists by making a HEAD request
      const response = await fetch(logoUrl, { method: 'HEAD' });
      if (response.ok) {
        this.currentLogoUrl = logoUrl;
      }
    } catch (error) {
      logger.warn('Could not load current logo from storage', { error });
    }
  }

  /**
   * Get fallback logo URL
   */
  public getFallbackLogo(): string {
    return LOGO_CONFIG.fallbackLogoPath;
  }

  /**
   * Check if logo file exists in storage
   */
  public async checkLogoExists(): Promise<boolean> {
    try {
      const logoUrl = this.getCurrentLogo();
      if (logoUrl === LOGO_CONFIG.fallbackLogoPath) {
        return false;
      }
      
      const response = await fetch(logoUrl, { method: 'HEAD' });
      return response.ok;
    } catch {
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

    // Check file type - support all major image formats
    if (!LOGO_CONFIG.allowedFormats.includes(file.type as any)) {
      return { 
        valid: false, 
        error: 'Only SVG, PNG, JPEG, and WebP files are allowed' 
      };
    }

    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!LOGO_CONFIG.allowedExtensions.includes(extension as any)) {
      return { 
        valid: false, 
        error: 'Only .svg, .png, .jpg, .jpeg, and .webp files are allowed' 
      };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const logoManager = LogoManager.getInstance();
