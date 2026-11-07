import { MediaError, validateImage, MAX_IMAGE_BYTES } from './validation.ts';
const assert = (condition: unknown, message = 'Assertion failed') => { if (!condition) throw new Error(message); };
const bytes = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
// Small real-format fixtures. Tests validate containers/headers, not pixel decode.
export const png = bytes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==');
const gif = bytes('R0lGODlhAgACAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQACgAAACwAAAAAAgACAAAIBgABCAQQEAAh+QQBCgABACwAAAAAAgACAIEAAP8AAAAAAAAAAAAIBgABCAQQEAA7');
const webp = bytes('UklGRsQAAABXRUJQVlA4WAoAAAACAAAAAQAAAQAAQU5JTQYAAAAAAAAAAABBTk1GSgAAAAAAAAAAAAEAAAEAAGQAAAJWUDggMgAAADABAJ0BKgIAAgABQCYloAADcAD+8ut///mwP/bz/wR6Af//0uD//pcH//S4P/SkAAAAQU5NRkYAAAAAAAAAAAABAAABAABkAAAAVlA4IC4AAAA0AQCdASoCAAIAAAAmJaAAA3AA/vtV4///S4P/+lwf/9Lg/9Lg//rV5Vesq6AA');
// Synthetic JPEG and two-frame GIF/WebP generated with Pillow; no private media.
const jpeg = bytes('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDi6KKK+ZP3E//Z');
const fixtures: Array<[Uint8Array, string]> = [[png,'image/png'],[gif,'image/gif'],[webp,'image/webp'],[jpeg,'image/jpeg']];
async function rejects(run: () => Promise<unknown>, code: string) {
  try { await run(); throw new Error('Expected rejection'); } catch (e) { assert(e instanceof MediaError && e.code === code, `Expected ${code}`); }
}
Deno.test('four raster formats retain exact encoded bytes and a SHA256', async () => {
  for (const [input,mime] of fixtures) { const before=input.slice();let result;
    try { result=await validateImage(input,mime); } catch (cause) { throw new Error(`Valid fixture rejected: ${mime}`,{cause}); }
    assert(result.mimeType===mime && result.byteSize===input.length && /^[a-f0-9]{64}$/.test(result.sha256));
    assert(input.every((x,i)=>x===before[i])); }
});
Deno.test('truncated containers, mismatched MIME, SVG and oversized bytes reject', async () => {
  for (const [input,mime] of fixtures) await rejects(()=>validateImage(input.subarray(0,input.length-1),mime),'IMAGE_INVALID');
  await rejects(()=>validateImage(png,'image/jpeg'),'IMAGE_TYPE_MISMATCH');
  await rejects(()=>validateImage(new TextEncoder().encode('<svg/>'),'image/svg+xml'),'IMAGE_TYPE_UNSUPPORTED');
  await rejects(()=>validateImage(new Uint8Array(MAX_IMAGE_BYTES+1),'image/png'),'IMAGE_SIZE_INVALID');
  const changed=png.slice();changed[changed.length-16]^=1;await rejects(()=>validateImage(changed,'image/png'),'IMAGE_INVALID');
});
