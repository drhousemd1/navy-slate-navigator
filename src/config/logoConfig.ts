
// Logo configuration and paths
export const LOGO_CONFIG = {
  // Current logo path - changed to PNG
  currentLogoPath: '/app-assets/logos/current/logo.png',
  
  // Archive directory
  archiveDirectory: '/app-assets/logos/archive',
  
  // Fallback logo path
  fallbackLogoPath: '/app-assets/logos/fallback/default-logo.svg',
  
  // File settings - updated to support PNG
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedFormats: ['image/svg+xml', 'image/png', 'image/jpeg'],
  allowedExtensions: ['.svg', '.png', '.jpg', '.jpeg'],
  
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
