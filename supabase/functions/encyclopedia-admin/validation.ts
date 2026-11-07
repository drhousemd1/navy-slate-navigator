import { MAX_IMAGE_BYTES, MediaError, validateImage } from '../message-media/validation.ts';
export const MAX_BODY_BYTES = 8 * 1024 * 1024;
export const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export class LibraryError extends Error { constructor(readonly code: string, readonly status = 400) { super(code); } }
function invalid(): never { throw new LibraryError('INVALID_INPUT'); }
const encoder = new TextEncoder();
export function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function keys(value: unknown, allowed: string[], required: string[] = []): asserts value is Record<string, unknown> {
  if (!object(value) || Object.keys(value).some(k => !allowed.includes(k)) || required.some(k => !Object.hasOwn(value, k))) invalid();
}
export function validateDocument(value: unknown) {
  keys(value, ['version', 'blocks'], ['version', 'blocks']);
  if (value.version !== 1 || !Array.isArray(value.blocks) || encoder.encode(JSON.stringify(value)).length > 512 * 1024) invalid();
  let nodes = 0, bytes = 0;
  const fonts = ['0.875rem', '1rem', '1.25rem', '1.5rem', '2rem'];
  for (const block of value.blocks) {
    keys(block, ['type', 'children'], ['type', 'children']);
    if (++nodes > 4096 || block.type !== 'paragraph' || !Array.isArray(block.children)) invalid();
    for (const child of block.children) {
      if (++nodes > 4096) invalid();
      if (object(child) && child.type === 'hardBreak') { keys(child, ['type'], ['type']); continue; }
      keys(child, ['type', 'text', 'marks'], ['type', 'text']);
      if (child.type !== 'text' || typeof child.text !== 'string' || child.text.includes('\u0000')) invalid();
      bytes += encoder.encode(child.text).length;
      if (bytes > 256 * 1024) invalid();
      // Angle brackets and other prose are literal React text, never markup.
      if (Object.hasOwn(child, 'marks')) {
        keys(child.marks, ['bold', 'italic', 'underline', 'fontSize']);
        for (const [key, mark] of Object.entries(child.marks)) {
          if (key === 'fontSize' ? typeof mark !== 'string' || !fonts.includes(mark) : typeof mark !== 'boolean') invalid();
        }
      }
    }
  }
}
export type Command = { commandId: string; entryId: string; expectedRevision: number; patch: Record<string, unknown> };
export async function validateCommand(value: unknown, operation: 'save' | 'delete'): Promise<Command> {
  const fields = ['commandId', 'entryId', 'expectedRevision', ...(operation === 'save' ? ['patch'] : [])];
  keys(value, fields, fields);
  if (typeof value.commandId !== 'string' || !UUID.test(value.commandId) || typeof value.entryId !== 'string' || !UUID.test(value.entryId) ||
    typeof value.expectedRevision !== 'number' || !Number.isSafeInteger(value.expectedRevision) || value.expectedRevision < (operation === 'delete' ? 1 : 0) || value.expectedRevision >= Number.MAX_SAFE_INTEGER) invalid();
  const patch = operation === 'delete' ? {} : value.patch;
  keys(patch, ['title', 'subtext', 'contentDocument', 'focalPointX', 'focalPointY', 'opacity', 'popupOpacity', 'titleColor', 'subtextColor', 'highlightEffect', 'image']);
  if (operation === 'save' && value.expectedRevision === 0 && ['title', 'subtext', 'contentDocument'].some(k => !Object.hasOwn(patch, k))) invalid();
  const normalized = { ...patch };
  for (const [key, field] of Object.entries(patch)) {
    if (key === 'title' || key === 'subtext') {
      if (typeof field !== 'string' || field.includes('\u0000') || [...field].length > (key === 'title' ? 200 : 2000) || key === 'title' && !field.trim()) invalid();
    } else if (key === 'contentDocument') validateDocument(field);
    else if (['focalPointX', 'focalPointY', 'opacity', 'popupOpacity'].includes(key)) {
      if (field !== null && (typeof field !== 'number' || !Number.isInteger(field) || field < 0 || field > 100)) invalid();
    } else if (key === 'titleColor' || key === 'subtextColor') {
      if (field !== null && (typeof field !== 'string' || !/^#(?:[a-f0-9]{3}|[a-f0-9]{4}|[a-f0-9]{6}|[a-f0-9]{8})$/i.test(field))) invalid();
    } else if (key === 'highlightEffect') { if (field !== null && typeof field !== 'boolean') invalid(); }
    else if (key === 'image') {
      if (!object(field) || !['keep', 'remove', 'replace'].includes(String(field.op))) invalid();
      keys(field, field.op === 'replace' ? ['op', 'dataUrl'] : ['op'], field.op === 'replace' ? ['op', 'dataUrl'] : ['op']);
      if (field.op === 'replace') {
        if (typeof field.dataUrl !== 'string' || field.dataUrl.length > 4 * Math.ceil(MAX_IMAGE_BYTES / 3) + 32) throw new LibraryError('IMAGE_SIZE_INVALID', 413);
        const match = field.dataUrl.match(/^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
        if (!match || match[2].length % 4 !== 0) throw new LibraryError('IMAGE_INVALID');
        let decoded: string;
        try { decoded = atob(match[2]); } catch { throw new LibraryError('IMAGE_INVALID'); }
        if (btoa(decoded) !== match[2]) throw new LibraryError('IMAGE_INVALID');
        try {
          const metadata = await validateImage(Uint8Array.from(decoded, c => c.charCodeAt(0)), match[1]);
          normalized.image = { op: 'replace', dataUrl: field.dataUrl, metadata };
        } catch (error) {
          if (error instanceof MediaError) throw new LibraryError(error.code, error.code === 'IMAGE_SIZE_INVALID' ? 413 : 400);
          throw error;
        }
      }
    }
  }
  return { commandId: value.commandId, entryId: value.entryId, expectedRevision: value.expectedRevision, patch: normalized };
}
