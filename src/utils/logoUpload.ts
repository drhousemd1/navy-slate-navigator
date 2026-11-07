import { LOGO_CONFIG } from '@/config/logoConfig';
import { compressImage } from '@/utils/image/compression';
export function validateLogoFile(file: File): { valid: boolean; error?: string } {
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!file.size || file.size > LOGO_CONFIG.maxFileSize) return { valid: false, error: 'Choose an image between 1 byte and 10 MB.' };
  if (!(LOGO_CONFIG.allowedExtensions as readonly string[]).includes(extension) ||
    !(LOGO_CONFIG.allowedFormats as readonly string[]).includes(file.type)) return { valid: false, error: 'Choose a PNG, JPEG, WebP or SVG image.' };
  return { valid: true };
}
export async function prepareLogo(file: File): Promise<Blob> {
  const valid = validateLogoFile(file);
  if (!valid.valid) throw new Error(valid.error);
  // Decode in an image element, never embed SVG markup in the document. Canvas
  // exports raster pixels only; external/cross-origin content fails closed when
  // the browser cannot export it. The shared compressor releases its object URL.
  const { blob } = await compressImage(file);
  if (!['image/png', 'image/jpeg'].includes(blob.type) || !blob.size || blob.size > LOGO_CONFIG.maxFileSize) throw new Error('The prepared logo must be a PNG or JPEG within 10 MB. Try a smaller image.');
  return blob;
}
