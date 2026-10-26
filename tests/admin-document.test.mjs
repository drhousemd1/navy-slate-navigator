import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseAdminDocumentManifest, verifyDocument } from '../src/features/admin-documents/manifest.ts';

const html = '<!doctype html><title>Private plan</title><p>Version one</p>';
const sha256 = createHash('sha256').update(html).digest('hex');
const manifest = { version: 'v1', title: 'Rebuild plan', updatedAt: '2026-10-26T05:00:00Z', object: `plan-${sha256}.html`, sha256 };

test('accepts the exact publication and verifies its bytes', async () => {
  assert.deepEqual(parseAdminDocumentManifest(manifest), manifest);
  assert.equal(await verifyDocument(new Blob([html]), sha256), html);
});

test('rejects external URLs, traversal and a different document path', () => {
  for (const object of ['https://example.com/plan.html', '../plan.html', 'current.json', 'plan-other.html']) {
    assert.throws(() => parseAdminDocumentManifest({ ...manifest, object }));
  }
});

test('rejects incomplete or malformed manifests', () => {
  for (const item of [null, {}, { ...manifest, updatedAt: 'yesterday' }, { ...manifest, sha256: 'missing' }, { ...manifest, title: '' }]) {
    assert.throws(() => parseAdminDocumentManifest(item));
  }
});

test('a publication with mixed or changed bytes cannot render', async () => {
  await assert.rejects(verifyDocument(new Blob([html.replace('one', 'two')]), sha256), /does not match/);
});

test('rejects an unexpectedly large document', async () => {
  await assert.rejects(verifyDocument(new Blob([new Uint8Array(10 * 1024 * 1024 + 1)]), sha256), /too large/);
});
