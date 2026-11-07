import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { entryDocument, documentText, importLegacyHtml, safeLegacyImage } from '@/data/encyclopedia/content';
import { decodeDocument, decodeLibrary, decodeReceipt, documentSchema, patchSchema } from '@/data/encyclopedia/schema';
import { imageMime, readEncyclopediaImage } from '@/data/encyclopedia/images';
import ArticleContent from '@/components/encyclopedia/ArticleContent';
import { entry, intent, receipt, image } from './encyclopedia.helpers';
afterEach(cleanup);

describe('shared article compatibility and safe content', () => {
  it('does not interpret Markdown or escaped newlines; keeps real whitespace and empty paragraphs', () => {
    const text = '  **literal**\\nkept\n\nlast  ';
    const doc = entryDocument(entry({ popup_text: text }));
    expect(documentText(doc)).toBe(text);
    expect(doc.blocks).toHaveLength(3);
    expect(doc.blocks[1].children).toEqual([]);
    expect(doc.blocks[0].children[0]).toMatchObject({ marks: { bold: false, underline: false, fontSize: '1rem' } });
  });
  it('partitions overlapping UTF-16 ranges without repeating text and preserves explicit false', () => {
    const doc = entryDocument(entry({ popup_text: 'A😀BCD', popup_text_formatting: { isBold: true }, formatted_sections: [
      { start: 1, end: 5, formatting: { isUnderlined: true } }, { start: 3, end: 6, formatting: { isBold: false } },
    ] }));
    expect(documentText(doc)).toBe('A😀BCD');
    expect(doc.blocks[0].children).toEqual([
      { type: 'text', text: 'A', marks: { bold: true } },
      { type: 'text', text: '😀', marks: { bold: true, underline: true } },
      { type: 'text', text: 'BC', marks: { bold: false, underline: true } },
      { type: 'text', text: 'D', marks: { bold: false } },
    ]);
  });
  it('imports legacy supported HTML into safe nodes, preserving marks, spaces and breaks without scripts or arbitrary CSS', () => {
    const doc = importLegacyHtml('<p> A  <b>B</b><br><span style="font-size: 1.5rem; background-image:url(javascript:evil())">C</span></p><p><i>I</i><u>U</u><img src=x onerror=evil()><script>evil()</script></p>');
    expect(documentText(doc)).toBe(' A  B\nC\nIU');
    expect(JSON.stringify(doc)).not.toMatch(/evil|background|img|script/);
    expect(doc.blocks[0].children[1]).toMatchObject({ text: 'B', marks: { bold: true } });
    expect(doc.blocks[0].children[3]).toMatchObject({ text: 'C', marks: { fontSize: '1.5rem' } });
    const { container } = render(<ArticleContent document={doc} />);
    expect(container.querySelector('script,img,iframe')).toBeNull();
    expect(container.querySelector('span[style*="font-size"]')?.textContent).toBe('C');
  });
  it('renders canonical angle brackets as literal text; false flags and hard breaks survive', () => {
    const doc = decodeDocument({ version: 1, blocks: [{ type: 'paragraph', children: [
      { type: 'text', text: '<img src=x onerror=evil()>', marks: { bold: false, italic: true, underline: false, fontSize: '2rem' } }, { type: 'hardBreak' }, { type: 'text', text: 'end' },
    ] }] });
    const { container } = render(<ArticleContent document={doc} />);
    expect(container.textContent).toBe('<img src=x onerror=evil()>end');
    expect(container.querySelector('img')).toBeNull(); expect(container.querySelectorAll('br')).toHaveLength(1);
    expect(container.querySelector('span')?.style.fontWeight).toBe('normal');
    expect(entryDocument(entry({ contentDocument: doc }))).toEqual(doc);
  });
  it('keeps zeros, false, null and untouched image metadata in the library and explicit patches', () => {
    const original = entry({ popup_text: null, title_color: null, highlight_effect: null });
    expect(decodeLibrary({ canEdit: false, entries: [original] }).entries[0]).toEqual(original);
    expect(patchSchema.parse({ opacity: 0, focalPointX: 0, highlightEffect: false, popupOpacity: null, titleColor: null })).toEqual({ opacity: 0, focalPointX: 0, highlightEffect: false, popupOpacity: null, titleColor: null });
    expect(patchSchema.parse({ subtext: 'Only description' })).not.toHaveProperty('contentDocument');
  });
  it('rejects unsupported documents, overflow and mismatched receipts', () => {
    expect(() => decodeDocument({ version: 1, blocks: [{ type: 'script', children: [] }] })).toThrow();
    expect(() => decodeDocument({ version: 1, blocks: [{ type: 'paragraph', children: [{ type: 'text', text: 'x'.repeat(256 * 1024 + 1) }] }] })).toThrow();
    expect(() => decodeDocument({ version: 1, blocks: Array.from({ length: 4097 }, () => ({ type: 'paragraph', children: [] })) })).toThrow();
    expect(() => decodeReceipt({ ...receipt(), revision: 20 }, intent())).toThrow();
    expect(() => decodeReceipt({ ...receipt(), deleted: true }, intent())).toThrow();
    expect(decodeReceipt(receipt(intent(), true), intent()).replayed).toBe(true);
    expect(() => decodeLibrary({ canEdit: true, entries: [entry(), entry()] })).toThrow();
  });
  it.each(['blocks', 'children'] as const)('rejects excessive %s before reading any item', field => {
    const excessive = new Array(field === 'blocks' ? 4097 : 4096);
    const readItem = vi.fn(() => { throw new Error('Collection item was visited'); });
    Object.defineProperty(excessive, 0, { get: readItem });
    const doc = { version: 1, blocks: field === 'blocks' ? excessive : [{ type: 'paragraph', children: excessive }] };
    expect(() => decodeDocument(doc)).toThrow('This article is too large.');
    expect(readItem).not.toHaveBeenCalled();
  });
  it('rejects excessive aggregate nodes and UTF-8 text before validating marks', () => {
    const readMarks = vi.fn(() => { throw new Error('Marks were validated'); });
    const text = { type: 'text', text: 'é'.repeat(128 * 1024 + 1), get marks() { return readMarks(); } };
    expect(() => decodeDocument({ version: 1, blocks: [{ type: 'paragraph', children: [text] }] })).toThrow('This article is too large.');
    expect(readMarks).not.toHaveBeenCalled();
    const blocks = Array.from({ length: 2049 }, () => ({ type: 'paragraph', children: [{ type: 'hardBreak' }] }));
    expect(() => decodeDocument({ version: 1, blocks })).toThrow('This article is too large.');
  });
  it('preserves exact node, UTF-8 text and serialized-byte boundaries', () => {
    const nodes = { version: 1, blocks: Array.from({ length: 4096 }, () => ({ type: 'paragraph', children: [] })) };
    expect(decodeDocument(nodes)).toEqual(nodes);
    const text = { version: 1, blocks: [{ type: 'paragraph', children: [{ type: 'text', text: 'é'.repeat(128 * 1024) }] }] };
    expect(decodeDocument(text)).toEqual(text);
    // JSON escaping can reach the byte cap while decoded text stays below its cap.
    const sized = { version: 1, blocks: [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }] };
    const remaining = 512 * 1024 - new TextEncoder().encode(JSON.stringify(sized)).length;
    sized.blocks[0].children[0].text = '\u0001'.repeat(Math.floor(remaining / 6)) + 'x'.repeat(remaining % 6);
    expect(new TextEncoder().encode(JSON.stringify(sized)).length).toBe(512 * 1024);
    expect(decodeDocument(sized)).toEqual(sized);
    sized.blocks[0].children[0].text += 'x';
    expect(() => decodeDocument(sized)).toThrow('This article is too large.');
  });
  it('returns one size issue before invalid-element issue amplification and keeps ordinary shape errors', () => {
    const doc = { version: 1, blocks: [{ type: 'paragraph', children: Array.from({ length: 4095 }, () => ({
      type: 'text', text: '', marks: { bold: 'invalid'.repeat(20) },
    })) }] };
    expect(new TextEncoder().encode(JSON.stringify(doc)).length).toBeGreaterThan(512 * 1024);
    const result = documentSchema.safeParse(doc);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBe(1);
      expect(result.error.issues[0]).toMatchObject({ code: 'custom', message: 'This article is too large.' });
    }
    for (const invalid of [null, { version: 2, blocks: [] }, { version: 1, blocks: 'invalid' }, { version: 1, blocks: [{ type: 'script', children: [] }] }]) {
      const parsed = documentSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
      if (!parsed.success) expect(parsed.error.issues.some(issue => issue.code !== 'custom')).toBe(true);
    }
  });
  it('allows existing raster/http images but blocks active schemes and SVG', () => {
    expect(safeLegacyImage(image)).toBe(image); expect(safeLegacyImage('https://example.com/image.png')).toBe('https://example.com/image.png');
    expect(safeLegacyImage('javascript:alert(1)')).toBeUndefined(); expect(safeLegacyImage('data:image/svg+xml;base64,PHN2Zz4=')).toBeUndefined();
    expect(imageMime(new Uint8Array([137,80,78,71,13,10,26,10]))).toBe('image/png');
    expect(imageMime(new TextEncoder().encode('<svg>'))).toBeNull();
  });
  it('rejects oversized or non-raster replacements before encoding', async () => {
    await expect(readEncyclopediaImage({ size: 5 * 1024 * 1024 + 1 } as File)).rejects.toThrow('5 MB');
    await expect(readEncyclopediaImage({ size: 5, arrayBuffer: async () => new TextEncoder().encode('<svg>').buffer } as File)).rejects.toThrow('supported raster');
  });
});
