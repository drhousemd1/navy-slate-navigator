export const LOGO_CONFIG = {
  defaultLogoPath: '/lovable-uploads/dcc2780c-ff8b-4d04-85f0-aef8a8ea62d8.png',
  fallbackLogoPath: '/app-assets/logos/fallback/default-logo.svg',
  defaultVersionId: '00000000-0000-4000-8000-000000000001',
  bucket: 'app-branding',
  maxFileSize: 10 * 1024 * 1024,
  allowedFormats: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'],
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp', '.svg'],
} as const;
export type LogoSize = 'small' | 'medium' | 'large' | 'responsive';
export const LOGO_SIZES = { small: '32px', medium: '64px', large: '128px', responsive: '100%' } as const;
