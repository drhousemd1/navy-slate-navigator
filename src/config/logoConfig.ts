
// Logo configuration and paths
export const LOGO_CONFIG = {
  // Supabase Storage bucket for logos
  bucketName: 'logos',
  
  // Current logo file name in storage
  currentLogoFileName: 'current-logo',
  
  // File settings - now supports all common image formats
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFormats: ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'],
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.svg', '.webp'],
  
  // Version tracking
  currentVersion: '1.0.0',
  
  // Default fallback when no logo is uploaded
  fallbackLogoPath: '/app-assets/logos/fallback/default-logo.svg'
} as const;

export type LogoSize = 'small' | 'medium' | 'large' | 'responsive';

export const LOGO_SIZES = {
  small: '32px',
  medium: '64px', 
  large: '128px',
  responsive: '100%'
} as const;
