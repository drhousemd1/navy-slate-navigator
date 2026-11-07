export const ENCYCLOPEDIA_FONT_SIZES = ['0.875rem', '1rem', '1.25rem', '1.5rem', '2rem'] as const;
export interface TextMarks { bold?: boolean; italic?: boolean; underline?: boolean; fontSize?: typeof ENCYCLOPEDIA_FONT_SIZES[number] }
export type ContentInline = { type: 'text'; text: string; marks?: TextMarks } | { type: 'hardBreak' };
export interface ContentDocument { version: 1; blocks: Array<{ type: 'paragraph'; children: ContentInline[] }> }
export interface LegacyFormatting { isBold?: boolean; isUnderlined?: boolean; isItalic?: boolean; fontSize?: string }
export interface LegacySection { start: number; end: number; formatting: LegacyFormatting }
export interface EncyclopediaEntry {
  id: string; title: string; subtext: string; popup_text: string | null;
  image_url?: string | null; image_meta?: unknown;
  focal_point_x?: number | null; focal_point_y?: number | null;
  opacity?: number | null; popup_opacity?: number | null;
  title_color?: string | null; subtext_color?: string | null; highlight_effect?: boolean | null;
  popup_text_formatting?: LegacyFormatting | null; formatted_sections?: LegacySection[] | null;
  created_at?: string | null; updated_at?: string | null;
  revision: number; contentDocument: ContentDocument | null;
}
export interface EncyclopediaLibrary { canEdit: boolean; entries: EncyclopediaEntry[] }
export type ImageIntent = { op: 'keep' | 'remove' } | { op: 'replace'; dataUrl: string };
export interface EncyclopediaPatch {
  title?: string; subtext?: string; contentDocument?: ContentDocument;
  focalPointX?: number | null; focalPointY?: number | null; opacity?: number | null; popupOpacity?: number | null;
  titleColor?: string | null; subtextColor?: string | null; highlightEffect?: boolean | null; image?: ImageIntent;
}
export interface EncyclopediaScope { backendId: string; accountId: string }
export interface EncyclopediaIntent {
  commandId: string; entryId: string; expectedRevision: number; kind: 'save' | 'delete'; patch?: EncyclopediaPatch;
}
export interface EncyclopediaReceipt { entryId: string; revision: number; deleted: boolean; replayed: boolean }
