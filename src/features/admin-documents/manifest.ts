export interface AdminDocumentManifest {
  version: string;
  title: string;
  updatedAt: string;
  object: string;
  sha256: string;
}

export function parseAdminDocumentManifest(value: unknown): AdminDocumentManifest {
  if (!value || typeof value !== 'object') throw new Error('Invalid document manifest');
  const item = value as Record<string, unknown>;
  if (
    typeof item.version !== 'string' || !/^[a-zA-Z0-9._-]{1,80}$/.test(item.version) ||
    typeof item.title !== 'string' || !item.title.trim() || item.title.length > 200 ||
    typeof item.updatedAt !== 'string' || !Number.isFinite(Date.parse(item.updatedAt)) ||
    typeof item.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(item.sha256) ||
    item.object !== `plan-${item.sha256}.html`
  ) throw new Error('Invalid document manifest');
  return item as unknown as AdminDocumentManifest;
}

export async function verifyDocument(blob: Blob, expectedHash: string): Promise<string> {
  if (blob.size > 10 * 1024 * 1024) throw new Error('Document is too large');
  const bytes = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const actualHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  if (actualHash !== expectedHash) throw new Error('Document version does not match');
  return new TextDecoder().decode(bytes);
}
