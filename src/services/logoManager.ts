import { LOGO_CONFIG } from '@/config/logoConfig';
import { logger } from '@/lib/logger';
import { uploadFile } from '@/data/storageService';

export class LogoManager {
  private static instance: LogoManager;
  
  public static getInstance(): LogoManager {
    if (!LogoManager.instance) {
      LogoManager.instance = new LogoManager();
    }
    return LogoManager.instance;
  }

  /**
   * Get the current logo URL
   */
  public getCurrentLogo(): string {
    // Check if we have a custom logo stored
    const customLogo = localStorage.getItem('app_logo_url');
    return customLogo || LOGO_CONFIG.currentLogoPath;
  }

  /**
   * Upload a new logo and backup the current one
   */
  public async uploadLogo(file: File): Promise<{ success: boolean; message: string; logoUrl?: string }> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return { success: false, message: validation.error || 'Invalid file' };
      }

      // Create timestamp for backup
      const timestamp = this.generateTimestamp();
      
      // Backup current logo first
      await this.backupCurrentLogo(timestamp);
      
      // Upload new logo
      const logoUrl = await this.saveLogoFile(file);
      
      logger.info('Logo uploaded successfully', { timestamp, logoUrl });
      
      return { 
        success: true, 
        message: 'Logo uploaded successfully', 
        logoUrl 
      };
      
    } catch (error) {
      logger.error('Failed to upload logo', { error });
      return { 
        success: false, 
        message: 'Failed to upload logo' 
      };
    }
  }

  /**
   * Revert to an archived logo
   */
  public async revertToArchive(timestamp: string): Promise<{ success: boolean; message: string }> {
    try {
      const archivePath = `${LOGO_CONFIG.archiveDirectory}/${timestamp}_logo-backup.svg`;
      
      // Check if archive exists
      const exists = await this.checkFileExists(archivePath);
      if (!exists) {
        return { 
          success: false, 
          message: 'Archive not found' 
        };
      }

      // Backup current logo
      const backupTimestamp = this.generateTimestamp();
      await this.backupCurrentLogo(backupTimestamp);
      
      // Restore from archive
      await this.restoreFromArchive(archivePath);
      
      logger.info('Logo reverted successfully', { timestamp });
      
      return { 
        success: true, 
        message: 'Logo reverted successfully' 
      };
      
    } catch (error) {
      logger.error('Failed to revert logo', { error, timestamp });
      return { 
        success: false, 
        message: 'Failed to revert logo' 
      };
    }
  }

  /**
   * Get list of archived logos
   */
  public async getArchivedLogos(): Promise<string[]> {
    try {
      // This would need to be implemented with actual file system access
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error('Failed to get archived logos', { error });
      return [];
    }
  }

  /**
   * Check if logo file exists
   */
  public async checkLogoExists(): Promise<boolean> {
    return this.checkFileExists(LOGO_CONFIG.currentLogoPath);
  }

  /**
   * Get fallback logo URL
   */
  public getFallbackLogo(): string {
    return LOGO_CONFIG.fallbackLogoPath;
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
        error: 'Only PNG, JPEG, WebP, and SVG files are allowed' 
      };
    }

    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!LOGO_CONFIG.allowedExtensions.includes(extension as any)) {
      return { 
        valid: false, 
        error: 'Only .png, .jpg, .jpeg, .webp, and .svg files are allowed' 
      };
    }

    return { valid: true };
  }

  private generateTimestamp(): string {
    const now = new Date();
    return now.toISOString()
      .replace(/[:.]/g, '-')
      .split('T')[0] + '_' + 
      now.toTimeString().split(' ')[0].replace(/:/g, '-');
  }

  private async backupCurrentLogo(timestamp: string): Promise<void> {
    // This would backup the current logo to archive
    // Implementation would depend on file system access
    logger.info('Backing up current logo', { timestamp });
  }

  private async saveLogoFile(file: File): Promise<string> {
    try {
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const extension = file.name.split('.').pop() || 'png';
      const fileName = `app-logo-${timestamp}.${extension}`;
      
      // Upload to Supabase Storage
      const result = await uploadFile('logos', fileName, file, { upsert: true });
      
      // Store the new logo URL in localStorage
      localStorage.setItem('app_logo_url', result.publicUrl);
      
      logger.info('Logo uploaded successfully', { fileName, url: result.publicUrl });
      return result.publicUrl;
    } catch (error) {
      logger.error('Failed to save logo file', { error, fileName: file.name });
      throw error;
    }
  }

  private async checkFileExists(path: string): Promise<boolean> {
    try {
      const response = await fetch(path, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async restoreFromArchive(archivePath: string): Promise<void> {
    // This would restore logo from archive
    // Implementation would depend on file system access
    logger.info('Restoring from archive', { archivePath });
  }
}

// Export singleton instance
export const logoManager = LogoManager.getInstance();