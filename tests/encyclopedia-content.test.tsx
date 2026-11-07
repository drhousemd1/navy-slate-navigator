import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { entryDocument, documentText, importLegacyHtml, safeLegacyImage } from '@/data/encyclopedia/content';
import { decodeDocument, decodeLibrary, decodeReceipt, patchSchema } from '@/data/encyclopedia/schema';
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
