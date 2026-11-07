import DOMPurify from 'dompurify';
import { ENCYCLOPEDIA_FONT_SIZES, type ContentDocument, type ContentInline, type EncyclopediaEntry, type LegacyFormatting, type TextMarks } from '@/types/encyclopedia';
import { decodeDocument } from './schema';
const size = (value: string | undefined) => ENCYCLOPEDIA_FONT_SIZES.find(item => item === value);
function legacyMarks(format: LegacyFormatting | null | undefined): TextMarks {
  if (!format) return {};
  return { ...(typeof format.isBold === 'boolean' ? { bold: format.isBold } : {}),
    ...(typeof format.isItalic === 'boolean' ? { italic: format.isItalic } : {}),
    ...(typeof format.isUnderlined === 'boolean' ? { underline: format.isUnderlined } : {}),
    ...(size(format.fontSize) ? { fontSize: size(format.fontSize) } : {}) };
}
/** Literal plaintext and UTF-16 offsets; overlap partitions text instead of repeating it. */
function plainLegacy(entry: EncyclopediaEntry): ContentDocument {
  const text = entry.popup_text ?? ''; const base = legacyMarks(entry.popup_text_formatting);
  const sections = (entry.formatted_sections ?? []).filter(s => Number.isInteger(s.start) && Number.isInteger(s.end) && s.end > s.start)
    .map(s => ({ ...s, start: Math.max(0, s.start), end: Math.min(text.length, s.end) })).filter(s => s.end > s.start);
  let offset = 0;
  const blocks = text.split('\n').map(line => {
    const start = offset, end = offset + line.length; offset = end + 1;
    const boundaries = [...new Set([start, end, ...sections.flatMap(s => [Math.max(start, Math.min(end, s.start)), Math.max(start, Math.min(end, s.end))])])].sort((a, b) => a - b);
    const children: ContentInline[] = [];
    for (let i = 0; i < boundaries.length - 1; i++) {
      const a = boundaries[i], b = boundaries[i + 1]; if (a === b) continue;
      const marks = sections.filter(s => s.start <= a && s.end >= b).reduce((all, s) => ({ ...all, ...legacyMarks(s.formatting) }), { ...base });
      children.push({ type: 'text', text: text.slice(a, b), marks });
    }
    return { type: 'paragraph' as const, children };
  });
  return { version: 1, blocks };
}
/** HTML is import-only. Never place legacy HTML or arbitrary CSS in the reader. */
export function importLegacyHtml(html: string, base: TextMarks = {}): ContentDocument {
  const fragment = DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true, ALLOWED_TAGS: ['p', 'div', 'br', 'span', 'strong', 'b', 'em', 'i', 'u', 'font'], ALLOWED_ATTR: ['style', 'size'] });
  const blocks: ContentDocument['blocks'] = []; let children: ContentInline[] = [];
  const finish = () => { blocks.push({ type: 'paragraph', children }); children = []; };
  const walk = (node: Node, inherited: TextMarks) => {
    if (node.nodeType === Node.TEXT_NODE) { if (node.textContent) children.push({ type: 'text', text: node.textContent, marks: { ...inherited } }); return; }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName.toLowerCase(); const block = tag === 'p' || tag === 'div';
    if (block && children.length) finish();
    if (tag === 'br') { children.push({ type: 'hardBreak' }); return; }
    const marks = { ...inherited };
    if (tag === 'strong' || tag === 'b') marks.bold = true;
    if (tag === 'em' || tag === 'i') marks.italic = true;
    if (tag === 'u') marks.underline = true;
    if (node.style.fontWeight === 'bold' || Number(node.style.fontWeight) >= 600) marks.bold = true;
    else if (['normal', '400'].includes(node.style.fontWeight)) marks.bold = false;
    if (node.style.fontStyle === 'italic') marks.italic = true;
    else if (node.style.fontStyle === 'normal') marks.italic = false;
    if (node.style.textDecoration.includes('underline')) marks.underline = true;
    else if (node.style.textDecoration === 'none') marks.underline = false;
    const fontSize = size(node.style.fontSize); if (fontSize) marks.fontSize = fontSize;
    node.childNodes.forEach(child => walk(child, marks));
    if (block) finish();
  };
  fragment.childNodes.forEach(node => walk(node, base));
  if (children.length || blocks.length === 0) finish();
  return { version: 1, blocks };
}
export function entryDocument(entry: EncyclopediaEntry): ContentDocument {
  if (entry.contentDocument !== null) return decodeDocument(entry.contentDocument);
  const raw = entry.popup_text ?? '';
  return /<\/?(?:p|div|br|span|strong|b|em|i|u|font)(?:\s|>|\/)/i.test(raw)
    ? importLegacyHtml(raw, legacyMarks(entry.popup_text_formatting)) : plainLegacy(entry);
}
export const documentText = (doc: ContentDocument) => doc.blocks.map(block => block.children.map(child => child.type === 'text' ? child.text : '\n').join('')).join('\n');
export function safeLegacyImage(value?: string | null): string | undefined {
  if (!value) return undefined;
  if (/^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/=\r\n]+$/i.test(value)) return value;
  try { const url = new URL(value, window.location.origin); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
}
