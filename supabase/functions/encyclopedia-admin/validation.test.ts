import { LibraryError, validateCommand, validateDocument } from './validation.ts';
const id = '11111111-1111-4111-8111-111111111111';
const doc = { version: 1, blocks: [{ type: 'paragraph', children: [{ type: 'text', text: '<literal> & educational prose', marks: { bold: true, italic: false, underline: true, fontSize: '1rem' } }, { type: 'hardBreak' }] }] };
const create = (patch: Record<string, unknown> = {}) => ({ commandId: id, entryId: id, expectedRevision: 0, patch: { title: 'Synthetic', subtext: '', contentDocument: doc, ...patch } });
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==';
const assert = (value: unknown) => { if (!value) throw new Error('assertion failed'); };
async function rejects(fn: () => unknown, code = 'INVALID_INPUT') { try { await fn(); } catch (e) { assert(e instanceof LibraryError && e.code === code); return; } throw new Error('expected rejection'); }
Deno.test('canonical text remains literal; zeros false null and omissions survive validation', async () => {
  const result = await validateCommand(create({ focalPointX: 0, focalPointY: null, opacity: 0, popupOpacity: null, highlightEffect: false, titleColor: null }), 'save');
  assert(JSON.stringify(result.patch.contentDocument) === JSON.stringify(doc));
  assert(result.patch.focalPointX === 0 && result.patch.focalPointY === null && result.patch.opacity === 0 && result.patch.popupOpacity === null && result.patch.highlightEffect === false && !Object.hasOwn(result.patch, 'image'));
});
Deno.test('new image bytes preserved; trusted metadata is derived and cannot be supplied', async () => {
  const dataUrl = `data:image/png;base64,${png}`;
  const result = await validateCommand(create({ image: { op: 'replace', dataUrl } }), 'save');
  const image = result.patch.image as { dataUrl: string; metadata: { byteSize: number; sha256: string } };
  assert(image.dataUrl === dataUrl && image.metadata.byteSize === atob(png).length && image.metadata.sha256.length === 64);
  await rejects(() => validateCommand(create({ image: { op: 'replace', dataUrl, metadata: {} } }), 'save'));
});
Deno.test('strict envelope, create requirements and revision limits', async () => {
  for (const input of [{ ...create(), actorId: id }, { ...create(), expectedRevision: -1 }, { ...create(), expectedRevision: 0.5 }, { ...create(), expectedRevision: Number.MAX_SAFE_INTEGER }, { ...create(), patch: { title: 'x' } }, { ...create(), patch: { image_meta: {} } }]) await rejects(() => validateCommand(input, 'save'));
  await rejects(() => validateCommand({ commandId: id, entryId: id, expectedRevision: 0 }, 'delete'));
  assert((await validateCommand({ commandId: id, entryId: id, expectedRevision: 1 }, 'delete')).expectedRevision === 1);
});
Deno.test('document schema rejects executable/unknown structures without filtering prose', async () => {
  for (const value of [{ ...doc, html: '<b>x</b>' }, { version: 1, blocks: [{ type: 'script', children: [] }] }, { version: 1, blocks: [{ type: 'paragraph', children: [{ type: 'text', text: 'x', marks: { onClick: 'x' } }] }] }, { version: 1, blocks: [{ type: 'paragraph', children: [{ type: 'text', text: 'x', marks: { fontSize: 'url(x)' } }] }] }]) await rejects(() => validateDocument(value));
  validateDocument({ version: 1, blocks: [] });
});
Deno.test('text/node limits and illegal scalar values are rejected', async () => {
  await rejects(() => validateDocument({ version: 1, blocks: [{ type: 'paragraph', children: [{ type: 'text', text: 'é'.repeat(131073) }] }] }));
  await rejects(() => validateDocument({ version: 1, blocks: Array.from({ length: 4097 }, () => ({ type: 'paragraph', children: [] })) }));
  for (const patch of [{ title: ' ' }, { title: 'a'.repeat(201) }, { subtext: 'a'.repeat(2001) }, { focalPointX: 1.5 }, { opacity: 101 }, { highlightEffect: 'false' }, { titleColor: 'red; background:url(x)' }, { contentDocument: null }]) await rejects(() => validateCommand(create(patch), 'save'));
});
Deno.test('new SVG, remote URLs, malformed base64 and MIME mismatch are rejected', async () => {
  for (const dataUrl of ['data:image/svg+xml;base64,PHN2Zz4=', 'https://example.invalid/image.png', 'data:image/png;base64,AAAA=']) await rejects(() => validateCommand(create({ image: { op: 'replace', dataUrl } }), 'save'), 'IMAGE_INVALID');
  await rejects(() => validateCommand(create({ image: { op: 'replace', dataUrl: `data:image/jpeg;base64,${png}` } }), 'save'), 'IMAGE_TYPE_MISMATCH');
  await rejects(() => validateCommand(create({ image: { op: 'replace', dataUrl: 'A'.repeat(7 * 1024 * 1024) } }), 'save'), 'IMAGE_SIZE_INVALID');
});
