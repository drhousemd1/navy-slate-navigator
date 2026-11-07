import { z } from 'zod';
import { ENCYCLOPEDIA_FONT_SIZES, type ContentDocument, type EncyclopediaEntry, type EncyclopediaIntent, type EncyclopediaReceipt } from '@/types/encyclopedia';
const bytes = (value: string) => new TextEncoder().encode(value).byteLength;
const marks = z.object({ bold: z.boolean().optional(), italic: z.boolean().optional(), underline: z.boolean().optional(), fontSize: z.enum(ENCYCLOPEDIA_FONT_SIZES).optional() }).strict();
const inline = z.union([z.object({ type: z.literal('text'), text: z.string(), marks: marks.optional() }).strict(), z.object({ type: z.literal('hardBreak') }).strict()]);
const documentShape = z.object({ version: z.literal(1), blocks: z.array(z.object({ type: z.literal('paragraph'), children: z.array(inline) }).strict()) }).strict();
export const documentSchema = documentShape.superRefine((doc, ctx) => {
  let nodes = doc.blocks.length; let text = 0;
  for (const block of doc.blocks) { nodes += block.children.length; for (const child of block.children) if (child.type === 'text') text += bytes(child.text); }
  if (nodes > 4096 || text > 256 * 1024 || bytes(JSON.stringify(doc)) > 512 * 1024) ctx.addIssue({ code: 'custom', message: 'This article is too large.' });
});
export const decodeDocument = (value: unknown) => documentSchema.parse(value) as ContentDocument;
const position = z.number().int().min(0).max(100).nullable();
const color = z.string().regex(/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i).nullable();
export const patchSchema = z.object({
  title: z.string().max(200).optional(), subtext: z.string().max(2000).optional(), contentDocument: documentSchema.optional(),
  focalPointX: position.optional(), focalPointY: position.optional(), opacity: position.optional(), popupOpacity: position.optional(),
  titleColor: color.optional(), subtextColor: color.optional(), highlightEffect: z.boolean().nullable().optional(),
  image: z.union([z.object({ op: z.enum(['keep', 'remove']) }).strict(), z.object({ op: z.literal('replace'), dataUrl: z.string().max(7 * 1024 * 1024) }).strict()]).optional(),
}).strict();
export const intentSchema = z.object({ commandId: z.string().uuid(), entryId: z.string().uuid(), expectedRevision: z.number().int().nonnegative().safe(),
  kind: z.enum(['save', 'delete']), patch: patchSchema.optional() }).strict().superRefine((value, ctx) => {
  if ((value.kind === 'save') !== (value.patch !== undefined) || value.kind === 'delete' && value.expectedRevision === 0)
    ctx.addIssue({ code: 'custom', message: 'Invalid editorial request.' });
});
const legacyFormatting = z.object({ isBold: z.boolean().optional(), isUnderlined: z.boolean().optional(), isItalic: z.boolean().optional(), fontSize: z.string().optional() }).passthrough();
const entrySchema = z.object({ id: z.string().uuid(), title: z.string(), subtext: z.string(), popup_text: z.string().nullable(),
  image_url: z.string().nullable().optional(), image_meta: z.unknown().optional(),
  focal_point_x: z.number().nullable().optional(), focal_point_y: z.number().nullable().optional(),
  opacity: z.number().nullable().optional(), popup_opacity: z.number().nullable().optional(), title_color: z.string().nullable().optional(), subtext_color: z.string().nullable().optional(),
  highlight_effect: z.boolean().nullable().optional(), popup_text_formatting: legacyFormatting.nullable().optional(),
  formatted_sections: z.array(z.object({ start: z.number(), end: z.number(), formatting: legacyFormatting }).passthrough()).nullable().optional(),
  created_at: z.string().nullable().optional(), updated_at: z.string().nullable().optional(), revision: z.number().int().positive().safe(), contentDocument: documentSchema.nullable(),
}).passthrough();
export function decodeLibrary(value: unknown) {
  const parsed = z.object({ canEdit: z.boolean(), entries: z.array(entrySchema) }).strict().parse(value);
  if (new Set(parsed.entries.map(entry => entry.id)).size !== parsed.entries.length) throw new Error('INVALID_LIBRARY');
  return { canEdit: parsed.canEdit, entries: parsed.entries as EncyclopediaEntry[] };
}
export function decodeReceipt(value: unknown, intent: EncyclopediaIntent): EncyclopediaReceipt {
  const receipt = z.object({ entryId: z.string().uuid(), revision: z.number().int().positive().safe(), deleted: z.boolean(), replayed: z.boolean() }).strict().parse(value);
  if (receipt.entryId !== intent.entryId || receipt.revision !== intent.expectedRevision + 1 || receipt.deleted !== (intent.kind === 'delete')) throw new Error('INVALID_EDITORIAL_RECEIPT');
  return receipt as EncyclopediaReceipt;
}

// Drafts may contain incomplete input; only a validated intent may be sent.
export const draftPatchSchema = patchSchema.extend({ title: z.string().optional(), subtext: z.string().optional(),
  titleColor: z.string().nullable().optional(), subtextColor: z.string().nullable().optional(), contentDocument: documentShape.optional(),
});
