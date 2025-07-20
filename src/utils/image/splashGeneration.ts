
import { logger } from '@/lib/logger';

export interface SplashSize {
  width: number;
  height: number;
  name: string;
  platform: 'ios' | 'android';
}

// Standard splash screen sizes
export const SPLASH_SIZES: SplashSize[] = [
  // iOS Splash Screens
  { width: 640, height: 960, name: 'Default@2x~iphone', platform: 'ios' },
  { width: 750, height: 1334, name: 'Default-667h', platform: 'ios' },
  { width: 1242, height: 2208, name: 'Default-736h@3x', platform: 'ios' },
  { width: 1125, height: 2436, name: 'Default-2436h@3x', platform: 'ios' },
  { width: 828, height: 1792, name: 'Default-1792h@2x', platform: 'ios' },
  { width: 1242, height: 2688, name: 'Default-2688h@3x', platform: 'ios' },
  { width: 1536, height: 2048, name: 'Default-Portrait@2x~ipad', platform: 'ios' },
  { width: 2048, height: 2732, name: 'Default-Portrait@2x~ipad-pro', platform: 'ios' },
  
  // Android Splash Screens  
  { width: 320, height: 480, name: 'splash-320x480', platform: 'android' },
  { width: 480, height: 800, name: 'splash-480x800', platform: 'android' },
  { width: 720, height: 1280, name: 'splash-720x1280', platform: 'android' },
  { width: 1080, height: 1920, name: 'splash-1080x1920', platform: 'android' },
];

export const generateSplashFromLogo = (logoCanvas: HTMLCanvasElement, width: number, height: number, backgroundColor: string = '#0A1F44'): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  canvas.width = width;
  canvas.height = height;

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Calculate logo size (30% of the smaller screen dimension)
  const logoSize = Math.min(width, height) * 0.3;
  
  // Center the logo
  const logoX = (width - logoSize) / 2;
  const logoY = (height - logoSize) / 2;

  // Draw logo with smooth scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(logoCanvas, logoX, logoY, logoSize, logoSize);

  return canvas;
};

export const generateSplashScreens = async (logoCanvas: HTMLCanvasElement): Promise<Map<string, Blob>> => {
  logger.info('[SplashGeneration] Starting splash screen generation');
  
  const splashes = new Map<string, Blob>();

  for (const splash of SPLASH_SIZES) {
    try {
      const splashCanvas = generateSplashFromLogo(logoCanvas, splash.width, splash.height);
      
      const blob = await new Promise<Blob>((resolve, reject) => {
        splashCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error(`Failed to create splash blob for ${splash.name}`));
          }
        }, 'image/png', 0.9);
      });

      splashes.set(`${splash.name}.png`, blob);
      logger.debug('[SplashGeneration] Generated splash:', { 
        name: splash.name, 
        size: `${splash.width}x${splash.height}`,
        blobSize: blob.size 
      });

    } catch (error) {
      logger.error('[SplashGeneration] Failed to generate splash:', { name: splash.name, error });
    }
  }

  logger.info('[SplashGeneration] Successfully generated splash screens:', splashes.size);
  return splashes;
};
