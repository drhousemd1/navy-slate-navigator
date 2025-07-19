// Logo configuration and paths
export const LOGO_CONFIG = {
  // Current logo path
  currentLogoPath: '/app-assets/logos/current/logo.svg',
  
  // Archive directory
  archiveDirectory: '/app-assets/logos/archive',
  
  // Fallback logo path
  fallbackLogoPath: '/app-assets/logos/fallback/default-logo.svg',
  
  // File settings
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFormats: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'],
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp', '.svg'],
  
  // Version tracking
  currentVersion: '1.0.0',
  
  // Timestamp format for archives
  timestampFormat: 'YYYY-MM-DD_HH-mm-ss'
} as const;

export type LogoSize = 'small' | 'medium' | 'large' | 'responsive';

export const LOGO_SIZES = {
  small: '32px',
  medium: '64px', 
  large: '128px',
  responsive: '100%'
} as const;