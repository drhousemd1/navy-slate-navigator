export const ENCYCLOPEDIA_IMAGE_LIMIT = 5 * 1024 * 1024;
export function imageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  const head = String.fromCharCode(...bytes.slice(0, 12));
  if (/^GIF8[79]a/.test(head)) return 'image/gif';
  if (head.startsWith('RIFF') && head.slice(8) === 'WEBP') return 'image/webp';
  return null;
}
export async function readEncyclopediaImage(file: File): Promise<string> {
  if (file.size > ENCYCLOPEDIA_IMAGE_LIMIT) throw new Error('Choose a PNG, JPEG, GIF or WebP image no larger than 5 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer()); const mime = imageMime(bytes);
  if (!mime) throw new Error('This file is not a supported raster image. Choose PNG, JPEG, GIF or WebP.');
  // Preserve original dimensions, transparency and animation; the server validates bytes again.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(`data:${mime};base64,${reader.result.split(',')[1]}`) : reject(new Error('The image could not be read.'));
    reader.onerror = () => reject(new Error('The image could not be read. Your previous image is unchanged.'));
    reader.readAsDataURL(new Blob([bytes], { type: mime }));
  });
}
