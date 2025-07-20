
import { compressImage } from './compression';
import { logger } from '@/lib/logger';

export interface IconSize {
  size: number;
  scale?: number;
  name: string;
  platform: 'ios' | 'android' | 'pwa';
}

// Standard icon sizes for iOS, Android, and PWA
export const ICON_SIZES: IconSize[] = [
  // PWA Icons
  { size: 192, name: 'icon-192', platform: 'pwa' },
  { size: 512, name: 'icon-512', platform: 'pwa' },
  
  // iOS Icons
  { size: 20, scale: 1, name: 'icon-20', platform: 'ios' },
  { size: 20, scale: 2, name: 'icon-20@2x', platform: 'ios' },
  { size: 20, scale: 3, name: 'icon-20@3x', platform: 'ios' },
  { size: 29, scale: 1, name: 'icon-29', platform: 'ios' },
  { size: 29, scale: 2, name: 'icon-29@2x', platform: 'ios' },
  { size: 29, scale: 3, name: 'icon-29@3x', platform: 'ios' },
  { size: 40, scale: 1, name: 'icon-40', platform: 'ios' },
  { size: 40, scale: 2, name: 'icon-40@2x', platform: 'ios' },
  { size: 40, scale: 3, name: 'icon-40@3x', platform: 'ios' },
  { size: 60, scale: 2, name: 'icon-60@2x', platform: 'ios' },
  { size: 60, scale: 3, name: 'icon-60@3x', platform: 'ios' },
  { size: 76, scale: 1, name: 'icon-76', platform: 'ios' },
  { size: 76, scale: 2, name: 'icon-76@2x', platform: 'ios' },
  { size: 83.5, scale: 2, name: 'icon-83.5@2x', platform: 'ios' },
  { size: 1024, scale: 1, name: 'icon-1024', platform: 'ios' },
  
  // Android Icons
  { size: 36, name: 'icon-36-ldpi', platform: 'android' },
  { size: 48, name: 'icon-48-mdpi', platform: 'android' },
  { size: 72, name: 'icon-72-hdpi', platform: 'android' },
  { size: 96, name: 'icon-96-xhdpi', platform: 'android' },
  { size: 144, name: 'icon-144-xxhdpi', platform: 'android' },
  { size: 192, name: 'icon-192-xxxhdpi', platform: 'android' },
];

export const loadImageFromUrl = async (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(new Error(`Failed to load image: ${error}`));
    img.src = url;
  });
};

export const cropImageToSquare = (image: HTMLImageElement): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Determine the crop area (center square of the smaller dimension)
  const minDimension = Math.min(image.width, image.height);
  canvas.width = minDimension;
  canvas.height = minDimension;

  // Calculate crop position to center the image
  const startX = (image.width - minDimension) / 2;
  const startY = (image.height - minDimension) / 2;

  // Draw the cropped square image
  ctx.drawImage(
    image,
    startX, startY, minDimension, minDimension,  // Source
    0, 0, minDimension, minDimension             // Destination
  );

  return canvas;
};

export const resizeCanvas = (sourceCanvas: HTMLCanvasElement, targetSize: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  canvas.width = targetSize;
  canvas.height = targetSize;

  // Use smooth scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  ctx.drawImage(sourceCanvas, 0, 0, targetSize, targetSize);
  
  return canvas;
};

export const generateIconsFromImage = async (imageUrl: string): Promise<Map<string, Blob>> => {
  logger.info('[IconGeneration] Starting icon generation from image:', imageUrl);
  
  try {
    // Load the original image
    const originalImage = await loadImageFromUrl(imageUrl);
    logger.info('[IconGeneration] Original image loaded:', { 
      width: originalImage.width, 
      height: originalImage.height 
    });

    // Crop to square
    const squareCanvas = cropImageToSquare(originalImage);
    logger.info('[IconGeneration] Image cropped to square:', squareCanvas.width);

    const icons = new Map<string, Blob>();

    // Generate all required icon sizes
    for (const iconSize of ICON_SIZES) {
      const finalSize = iconSize.scale ? iconSize.size * iconSize.scale : iconSize.size;
      const resizedCanvas = resizeCanvas(squareCanvas, Math.round(finalSize));
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        resizedCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error(`Failed to create blob for ${iconSize.name}`));
          }
        }, 'image/png', 1.0);
      });

      icons.set(`${iconSize.name}.png`, blob);
      logger.debug('[IconGeneration] Generated icon:', { 
        name: iconSize.name, 
        size: finalSize,
        blobSize: blob.size 
      });
    }

    logger.info('[IconGeneration] Successfully generated all icons:', icons.size);
    return icons;

  } catch (error) {
    logger.error('[IconGeneration] Failed to generate icons:', error);
    throw error;
  }
};
