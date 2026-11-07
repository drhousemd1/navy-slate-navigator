import { imageSize } from 'image-size';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export class MediaError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
const invalid = () => { throw new MediaError('IMAGE_INVALID'); };
const ascii = (b: Uint8Array, i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n));
const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};
function png(b: Uint8Array, view: DataView) {
  let at = 8, first = true, data = false, ended = false;
  while (at < b.length) {
    if (at + 12 > b.length) invalid();
    const size = view.getUint32(at), kind = ascii(b, at + 4, 4), end = at + 12 + size;
    if (end > b.length || (first && (kind !== 'IHDR' || size !== 13))) invalid();
    if (crc32(b.subarray(at + 4, at + 8 + size)) !== view.getUint32(at + 8 + size)) invalid();
    if (kind === 'IDAT') data = true;
    if (kind === 'IEND') { if (size !== 0 || end !== b.length) invalid(); ended = true; }
    first = false; at = end;
  }
  if (!data || !ended) invalid();
}
function jpeg(b: Uint8Array, view: DataView) {
  let at = 2, frame = false, scan = false, ended = false;
  while (at < b.length) {
    if (b[at++] !== 0xff) invalid();
    while (b[at] === 0xff) at++;
    const marker = b[at++];
    if (marker === 0xd9) { ended = at === b.length; break; }
    if (marker === undefined || marker === 0x00 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) invalid();
    if (at + 2 > b.length) invalid();
    const length = view.getUint16(at);
    if (length < 2 || at + length > b.length) invalid();
    if ([0xc0, 0xc1, 0xc2].includes(marker)) { if (length < 8) invalid(); frame = true; }
    at += length;
    if (marker === 0xda) {
      scan = true;
      // Walk entropy bytes, stuffed FF00 and restart markers; don't decode pixels.
      while (at < b.length) {
        if (b[at] !== 0xff) { at++; continue; }
        const next = b[at + 1];
        if (next === 0 || (next >= 0xd0 && next <= 0xd7)) { at += 2; continue; }
        break;
      }
    }
  }
  if (!frame || !scan || !ended) invalid();
}
function gif(b: Uint8Array, view: DataView) {
  if (b.length < 14) invalid();
  let at = 13 + (b[10] & 0x80 ? 3 * (2 ** ((b[10] & 7) + 1)) : 0), frames = 0, ended = false;
  const blocks = () => {
    for (;;) {
      if (at >= b.length) invalid();
      const n = b[at++]; if (n === 0) return;
      at += n; if (at > b.length) invalid();
    }
  };
  while (at < b.length) {
    const kind = b[at++];
    if (kind === 0x3b) { ended = at === b.length; break; }
    if (kind === 0x21) { if (at >= b.length) invalid(); at++; blocks(); }
    else if (kind === 0x2c) {
      if (at + 9 > b.length || view.getUint16(at + 4, true) === 0 || view.getUint16(at + 6, true) === 0) invalid();
      if (view.getUint16(at, true) + view.getUint16(at + 4, true) > view.getUint16(6, true) ||
          view.getUint16(at + 2, true) + view.getUint16(at + 6, true) > view.getUint16(8, true)) invalid();
      const packed = b[at + 8]; at += 9 + (packed & 0x80 ? 3 * (2 ** ((packed & 7) + 1)) : 0);
      if (at >= b.length || b[at] < 2 || b[at] > 8) invalid(); at++; blocks(); frames++;
    } else invalid();
  }
  if (!ended || frames === 0) invalid();
}
function webp(b: Uint8Array, view: DataView) {
  if (view.getUint32(4, true) + 8 !== b.length) invalid();
  let image = false, animation = false, frames = 0;
  const chunks = (start: number, end: number, frame = false) => {
    let at = start, frameImage = false;
    while (at < end) {
      if (at + 8 > end) invalid();
      const kind = ascii(b, at, 4), size = view.getUint32(at + 4, true), data = at + 8, next = data + size + (size & 1);
      if (next > end) invalid();
      if (kind === 'VP8 ' || kind === 'VP8L') {
        if (size < (kind === 'VP8 ' ? 10 : 5)) invalid();
        if (kind === 'VP8 ' && ascii(b, data + 3, 3) !== '\x9d\x01\x2a') invalid();
        if (kind === 'VP8L' && b[data] !== 0x2f) invalid();
        image = true; frameImage = true;
      } else if (kind === 'VP8X') { if (frame || size !== 10) invalid(); animation = (b[data] & 2) !== 0; }
      else if (kind === 'ANMF') {
        if (frame || size < 24) invalid(); chunks(data + 16, data + size, true); frames++;
      } else if (kind === 'ANIM' && size !== 6) invalid();
      at = next;
    }
    if (frame && !frameImage) invalid();
  };
  chunks(12, b.length);
  if (!image || (animation && frames === 0) || (!animation && frames !== 0)) invalid();
}

/** Validates encoded structure and parsed/header dimensions, NOT full pixel decode.
 * Preserve accepted bytes (including animation). No URL fetching or native library.
 */
export async function validateImage(bytes: Uint8Array, declaredType: string) {
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) throw new MediaError('IMAGE_SIZE_INVALID');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let mimeType: string;
  if (bytes.length >= 8 && ascii(bytes, 0, 8) === '\x89PNG\r\n\x1a\n') { mimeType = 'image/png'; png(bytes, view); }
  else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) { mimeType = 'image/jpeg'; jpeg(bytes, view); }
  else if (['GIF87a', 'GIF89a'].includes(ascii(bytes, 0, 6))) { mimeType = 'image/gif'; gif(bytes, view); }
  else if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') { mimeType = 'image/webp'; webp(bytes, view); }
  else throw new MediaError('IMAGE_TYPE_UNSUPPORTED');
  if (declaredType && declaredType !== mimeType) throw new MediaError('IMAGE_TYPE_MISMATCH');
  let dimensions;
  try { dimensions = imageSize(bytes); } catch { invalid(); }
  if (!dimensions?.width || !dimensions?.height || dimensions.width > 32768 || dimensions.height > 32768 || dimensions.width * dimensions.height > 100_000_000)
    throw new MediaError('IMAGE_DIMENSIONS_INVALID');
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer));
  return { mimeType, byteSize: bytes.length, sha256: Array.from(digest, x => x.toString(16).padStart(2, '0')).join('') };
}
