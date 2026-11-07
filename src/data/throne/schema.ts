import { z } from 'zod';
import { metricNames, type ActivityMetrics, type MetricName } from '@/data/metrics/projection';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_CARD_BYTES = 6 * 1024 * 1024;
export const MAX_CARDS = 20;
const color = z.string().regex(/^#(?:[a-f\d]{3}|[a-f\d]{4}|[a-f\d]{6}|[a-f\d]{8})$/i).nullable();
const position = z.number().int().min(0).max(100).nullable();
const dimensions = z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).strict();
export const imageSchema = z.object({
  dataUrl: z.string().max(Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 30).regex(/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/),
  metadata: z.object({
    originalSize: z.number().int().positive().max(12 * 1024 * 1024), compressedSize: z.number().int().positive().max(MAX_IMAGE_BYTES),
    compressionRatio: z.number().int(), originalDimensions: dimensions,
    compressedDimensions: dimensions.extend({ width: z.number().int().min(1).max(1920), height: z.number().int().min(1).max(1080) }),
    timestamp: z.string().datetime(),
  }).strict(),
}).strict().superRefine((value, context) => {
  const base64 = value.dataUrl.slice(value.dataUrl.indexOf(',') + 1);
  const bytes = base64.length / 4 * 3 - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
  if (base64.length % 4 || bytes !== value.metadata.compressedSize || bytes > MAX_IMAGE_BYTES ||
      !(value.dataUrl.startsWith('data:image/png;base64,iVBORw0KGgo') || value.dataUrl.startsWith('data:image/jpeg;base64,/9j/'))) {
    context.addIssue({ code: 'custom', message: 'The compressed image could not be verified.' });
  }
});
export type ThroneImage = z.infer<typeof imageSchema>;
export const definitionSchema = z.object({
  title: z.string().min(1).max(200).refine(value => !!value.trim()), description: z.string().max(2000),
  series: z.enum(metricNames), priority: z.enum(['low', 'medium', 'high']),
  iconName: z.string().regex(/^[A-Za-z][A-Za-z0-9]{0,63}$/).nullable(), icon: imageSchema.nullable(),
  titleColor: color, descriptionColor: color, iconColor: color, calendarColor: color,
  images: z.array(imageSchema.nullable()).length(5), opacity: position, focalX: position, focalY: position,
  highlight: z.boolean(),
}).strict().refine(value => !(value.icon && value.iconName), 'Choose a preset or uploaded icon.');
export type ThroneDefinition = z.infer<typeof definitionSchema>;
export const cardSchema = z.object({ id: z.string().uuid(), ownerId: z.string().uuid(), revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), definition: definitionSchema }).strict();
export type ThroneCard = z.infer<typeof cardSchema>;
export interface ThroneIntent { commandId: string; cardId: string; expectedRevision: number; kind: 'save' | 'delete'; definition: ThroneDefinition | null }
export const receiptSchema = z.object({ commandId: z.string().uuid(), cardId: z.string().uuid(), revision: z.number().int().positive(), deleted: z.boolean(), replayed: z.boolean() }).strict();
export type ThroneReceipt = z.infer<typeof receiptSchema>;

export function assertCardSize(value: unknown) {
  // Bound the aggregate before expensive per-image parsing or network admission.
  if (new TextEncoder().encode(JSON.stringify(value)).length > MAX_CARD_BYTES) throw new Error('CARD_TOO_LARGE');
}
export function validateDefinition(value: unknown): ThroneDefinition {
  assertCardSize(value); return definitionSchema.parse(value);
}
export function validateIntent(intent: ThroneIntent) {
  z.string().uuid().parse(intent.commandId); z.string().uuid().parse(intent.cardId);
  z.number().int().min(0).max(Number.MAX_SAFE_INTEGER - 1).parse(intent.expectedRevision);
  if (intent.kind === 'save') validateDefinition(intent.definition);
  else if (intent.kind !== 'delete' || intent.expectedRevision === 0 || intent.definition !== null) throw new Error('INVALID_INPUT');
}
export function decodeCards(value: unknown, owner: string): ThroneCard[] {
  const cards = z.array(cardSchema).max(MAX_CARDS).parse(value);
  if (cards.some(card => card.ownerId !== owner) || new Set(cards.map(card => card.id)).size !== cards.length) throw new Error('CARDS_UNAVAILABLE');
  return cards;
}
export const seriesLabels: Record<MetricName, string> = {
  subTasksCompleted: 'Sub tasks completed', domTasksCompleted: 'Dom tasks completed', rulesBroken: 'Rules broken',
  subRewardsRedeemed: 'Sub rewards redeemed', domRewardsRedeemed: 'Dom rewards redeemed', punishmentsPerformed: 'Punishments performed',
};
export function cardActivity(data: ActivityMetrics, series: MetricName) {
  const role = series.startsWith('dom') ? 'dom' : 'sub';
  const range = data.ranges.find(item => item.role === role);
  if (!range) return null;
  return { total: data.totals[series], range, days: data.dataArray.filter(day => day.date >= range.start && day.date < range.end).map(day => ({ date: day.date, count: day[series] })) };
}
export function newThroneDefinition(): ThroneDefinition {
  return { title: '', description: '', series: 'subTasksCompleted', priority: 'medium', iconName: 'Activity', icon: null,
    titleColor: '#FFFFFF', descriptionColor: '#8E9196', iconColor: '#FFFFFF', calendarColor: '#7E69AB',
    images: [null, null, null, null, null], opacity: 100, focalX: 50, focalY: 50, highlight: false };
}
