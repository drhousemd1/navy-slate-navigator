
// Logo configuration and paths
export const LOGO_CONFIG = {
  // Fallback logo path for when no logo is uploaded
  fallbackLogoPath: '/app-assets/logos/fallback/default-logo.svg',
  
  // File settings - support all major image formats
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFormats: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'],
  allowedExtensions: ['.svg', '.png', '.jpg', '.jpeg', '.webp'],
  
  // Storage settings
  storageBucket: 'logos',
  currentLogoPath: 'current/',
  
  // Version tracking
  currentVersion: '1.0.0'
} as const;

export type LogoSize = 'small' | 'medium' | 'large' | 'responsive';

export const LOGO_SIZES = {
  small: '32px',
  medium: '64px', 
  large: '128px',
  responsive: '100%'
} as const;
