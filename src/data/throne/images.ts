import { compressImage } from '@/utils/image/compression';
import { imageSchema, MAX_IMAGE_BYTES, type ThroneImage } from './schema';

/** Same decoded PNG/JPEG compression path as the four main editors; no remote fetch. */
export async function readThroneImage(file: File): Promise<ThroneImage> {
  if (!file.size || file.size > 12 * 1024 * 1024) throw new Error('Choose an image up to 12 MB.');
  if (file.type && !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPEG, GIF or WebP image.');
  const { blob, metadata } = await compressImage(file);
  if (blob.size > MAX_IMAGE_BYTES) throw new Error('The compressed image exceeds 2 MB. Choose a smaller image.');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Image could not be read.'));
    reader.onerror = () => reject(new Error('Image could not be read.')); reader.readAsDataURL(blob);
  });
  return imageSchema.parse({ dataUrl, metadata });
}
