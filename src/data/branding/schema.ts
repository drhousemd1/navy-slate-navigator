import { z } from 'zod';
import { LOGO_CONFIG } from '@/config/logoConfig';
const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const revision = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const extensions = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
export const versionSchema = z.object({
  id: uuid, objectPath: z.string().nullable(), mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']).nullable(),
  byteSize: z.number().int().min(1).max(LOGO_CONFIG.maxFileSize).nullable(), sha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  createdAt: z.string().refine(value => Number.isFinite(Date.parse(value))),
}).strict().refine(v => v.id === LOGO_CONFIG.defaultVersionId
  ? v.objectPath === null && v.mimeType === null && v.byteSize === null && v.sha256 === null
  : v.mimeType !== null && v.byteSize !== null && v.sha256 !== null && v.objectPath === `versions/${v.id}/${v.sha256}.${extensions[v.mimeType]}`);
export const currentSchema = z.object({ revision, version: versionSchema }).strict();
export const historySchema = z.object({ current: currentSchema, versions: z.array(versionSchema), selections: z.array(z.object({
  revision, versionId: uuid, selectedAt: z.string().refine(value => Number.isFinite(Date.parse(value))),
}).strict()) }).strict();
export type LogoVersion = z.infer<typeof versionSchema>;
export type LogoCurrent = z.infer<typeof currentSchema>;
export type LogoHistory = z.infer<typeof historySchema>;
export type LogoIntent = { commandId: string; expectedRevision: number } & ({ kind: 'upload'; blob: Blob } | { kind: 'restore'; versionId: string });
export const receiptSchema = z.object({ commandId: uuid, versionId: uuid, revision, replayed: z.boolean() }).strict();
export function logoSource(version: LogoVersion | undefined, backend: string) {
  if (!version || version.id === LOGO_CONFIG.defaultVersionId) return LOGO_CONFIG.defaultLogoPath;
  // Never adopt an arbitrary URL or a path supplied by an unvalidated response.
  const v = versionSchema.parse(version);
  const url = new URL(backend);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Invalid branding backend');
  return `${url.origin}/storage/v1/object/public/${LOGO_CONFIG.bucket}/${v.objectPath}`;
}
