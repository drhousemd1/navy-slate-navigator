import { parseAdminDocumentManifest, verifyDocument, type AdminDocumentManifest } from './manifest.ts';

export const REVISION_PREFIX = 'revisions';
export const PAGE_SIZE = 100;
export const MAX_REVISIONS = 10000;
export const MAX_MANIFEST_BYTES = 8192;
export interface PublicationStore {
  read(path: string, limit: number): Promise<Uint8Array>;
  list(offset: number, limit: number): Promise<string[]>;
  create(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
}
export interface PublicationHead {
  sequence: number; sha256: string; documentVersion: string; documentSha256: string;
}
export interface PublicationRevision {
  format: 1; sequence: number; publishedAt: string;
  previous: { object: string; sha256: string; documentVersion: string; documentSha256: string };
  document: AdminDocumentManifest;
}
export interface VerifiedPublication {
  head: PublicationHead; manifest: AdminDocumentManifest; publishedAt: string; html: string;
  chain: PublicationHead[];
}
export class PublicationError extends Error {
  readonly code: 'integrity' | 'storage' | 'access' | 'conflict' | 'unconfirmed';
  constructor(code: PublicationError['code'], message: string) { super(message); this.name = 'PublicationError'; this.code = code; }
}
const digestPattern = /^[a-f0-9]{64}$/;
const encoder = new TextEncoder();
const need = (ok: unknown) => { if (!ok) throw new PublicationError('integrity', 'The publication chain could not be verified.'); };
function exact(value: unknown, keys: string[]): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join() === keys.sort().join();
}
export async function sha256(bytes: Uint8Array): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer)), n => n.toString(16).padStart(2, '0')).join('');
}
export function revisionPath(sequence: number): string {
  need(Number.isSafeInteger(sequence) && sequence >= 0 && sequence <= MAX_REVISIONS);
  return sequence === 0 ? 'current.json' : `${REVISION_PREFIX}/${String(sequence).padStart(12, '0')}.json`;
}
function json(bytes: Uint8Array, limit = MAX_MANIFEST_BYTES): unknown {
  need(bytes.length > 0 && bytes.length <= limit);
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new PublicationError('integrity', 'The publication metadata is invalid.'); }
}
export function parseHead(value: unknown): PublicationHead {
  need(exact(value, ['sequence', 'sha256', 'documentVersion', 'documentSha256']));
  const head = value as PublicationHead;
  revisionPath(head.sequence);
  need(digestPattern.test(head.sha256) && digestPattern.test(head.documentSha256) &&
    typeof head.documentVersion === 'string' && /^[a-zA-Z0-9._-]{1,80}$/.test(head.documentVersion));
  return head;
}
export function parseRevision(bytes: Uint8Array): PublicationRevision {
  const value = json(bytes);
  need(exact(value, ['format', 'sequence', 'publishedAt', 'previous', 'document']));
  const revision = value as unknown as PublicationRevision;
  need(revision.format === 1 && Number.isSafeInteger(revision.sequence) && revision.sequence > 0 && revision.sequence <= MAX_REVISIONS &&
    typeof revision.publishedAt === 'string' && Number.isFinite(Date.parse(revision.publishedAt)) &&
    exact(revision.previous, ['object', 'sha256', 'documentVersion', 'documentSha256']));
  need(revision.previous.object === revisionPath(revision.sequence - 1));
  parseHead({ sequence: revision.sequence - 1, sha256: revision.previous.sha256,
    documentVersion: revision.previous.documentVersion, documentSha256: revision.previous.documentSha256 });
  need(exact(revision.document, ['version', 'title', 'updatedAt', 'object', 'sha256']));
  parseAdminDocumentManifest(revision.document);
  return revision;
}
export function prepareRevision(expected: PublicationHead, document: AdminDocumentManifest, publishedAt: string): Uint8Array {
  parseHead(expected);
  const revision: PublicationRevision = { format: 1, sequence: expected.sequence + 1, publishedAt,
    previous: { object: revisionPath(expected.sequence), sha256: expected.sha256,
      documentVersion: expected.documentVersion, documentSha256: expected.documentSha256 },
    document: { version: document.version, title: document.title, updatedAt: document.updatedAt, object: document.object, sha256: document.sha256 } };
  const bytes = encoder.encode(JSON.stringify(revision) + '\n');
  parseRevision(bytes);
  return bytes;
}
function head(sequence: number, hash: string, document: AdminDocumentManifest): PublicationHead {
  return { sequence, sha256: hash, documentVersion: document.version, documentSha256: document.sha256 };
}
function sameHead(a: PublicationHead, b: PublicationHead) {
  return a.sequence === b.sequence && a.sha256 === b.sha256 && a.documentVersion === b.documentVersion && a.documentSha256 === b.documentSha256;
}

/** Append-only sorted slots make offset paging stable. A concurrent append can
 * appear on this refresh or the next; no partial/malformed prefix is selected. */
export async function readPublication(store: PublicationStore): Promise<VerifiedPublication> {
  const genesis = await store.read('current.json', 4096);
  let manifest = parseAdminDocumentManifest(json(genesis, 4096));
  let current = head(0, await sha256(genesis), manifest), publishedAt = manifest.updatedAt;
  const chain = [current];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const names = await store.list(offset, PAGE_SIZE);
    need(Array.isArray(names) && names.length <= PAGE_SIZE);
    for (const name of names) {
      const sequence = chain.length;
      need(sequence <= MAX_REVISIONS && name === `${String(sequence).padStart(12, '0')}.json`);
      const bytes = await store.read(revisionPath(sequence), MAX_MANIFEST_BYTES);
      const revision = parseRevision(bytes);
      need(revision.sequence === sequence && revision.previous.object === revisionPath(current.sequence) &&
        sameHead(current, { sequence: sequence - 1, sha256: revision.previous.sha256,
          documentVersion: revision.previous.documentVersion, documentSha256: revision.previous.documentSha256 }));
      manifest = revision.document;
      current = head(sequence, await sha256(bytes), manifest);
      publishedAt = revision.publishedAt;
      chain.push(current);
    }
    if (names.length < PAGE_SIZE) break;
  }
  const bytes = await store.read(manifest.object, 10 * 1024 * 1024);
  const html = await verifyDocument(new Blob([new Uint8Array(bytes)]), manifest.sha256);
  // Detect an obsolete publisher replacing genesis during this operation.
  need(await sha256(await store.read('current.json', 4096)) === chain[0].sha256);
  return { head: current, manifest, html, publishedAt, chain };
}

/** The frozen candidate is the retry identity. No conflict rebases or overwrites. */
export async function publishRevision(store: PublicationStore, frozen: Uint8Array, html: Uint8Array) {
  const revision = parseRevision(frozen), hash = await sha256(frozen);
  await verifyDocument(new Blob([new Uint8Array(html)]), revision.document.sha256);
  try { await store.create(revision.document.object, html, 'text/html'); }
  catch { /* Existing immutable bytes, a lost reply or an unknown failure require readback. */ }
  // A failed/missing/wrong HTML object can never claim a revision slot.
  await verifyDocument(new Blob([new Uint8Array(await store.read(revision.document.object, 10 * 1024 * 1024))]), revision.document.sha256);
  const current = await readPublication(store);
  const already = current.chain[revision.sequence];
  if (already?.sha256 === hash) return { committed: true, replayed: true, current: current.head.sequence === revision.sequence, head: already };
  const expected = { sequence: revision.sequence - 1, sha256: revision.previous.sha256,
    documentVersion: revision.previous.documentVersion, documentSha256: revision.previous.documentSha256 };
  if (!sameHead(current.head, expected)) throw new PublicationError('conflict', 'Another publication won. Review its version before preparing a new publication.');
  const path = revisionPath(revision.sequence);
  try { await store.create(path, frozen, 'application/json'); }
  catch { /* Resolve only this exact slot. Never automatically move to the next one. */ }
  let actual: Uint8Array;
  try { actual = await store.read(path, MAX_MANIFEST_BYTES); }
  catch { throw new PublicationError('unconfirmed', 'Publication is unconfirmed. Keep and retry the same prepared request.'); }
  if (await sha256(actual) !== hash) throw new PublicationError('conflict', 'Another publication won. The prepared publication was not selected.');
  const verified = await readPublication(store);
  need(verified.chain[revision.sequence]?.sha256 === hash);
  return { committed: true, replayed: false, current: verified.head.sequence === revision.sequence, head: verified.chain[revision.sequence] };
}
