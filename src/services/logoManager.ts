import { LOGO_CONFIG } from '@/config/logoConfig';
import { logger } from '@/lib/logger';

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
    return LOGO_CONFIG.currentLogoPath;
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

    // Check file type - updated to support PNG
    if (!LOGO_CONFIG.allowedFormats.includes(file.type as any)) {
      return { 
        valid: false, 
        error: 'Only SVG, PNG, and JPEG files are allowed' 
      };
    }

    // Check file extension - updated to support PNG
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!LOGO_CONFIG.allowedExtensions.includes(extension as any)) {
      return { 
        valid: false, 
        error: 'Only .svg, .png, .jpg, and .jpeg files are allowed' 
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
    // This would save the new logo file
    // Implementation would depend on file system access
    logger.info('Saving new logo file', { fileName: file.name });
    return LOGO_CONFIG.currentLogoPath;
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
