/** PREPARED local-only registration/cutover helper. Never copies/deletes bytes.
 * Explicit operator invocation only; defaults to offline verification.
 * node ... --manifest /private/.../media/manifest.json --replacements /private/.../media/local-url-replacements.json
 *   [--status /private/.../status.private.json --register]
 * Cutover is a separate invocation with --cutover --endpoint-verified, after actual
 * authorized/unauthorized endpoint checks. No credentials or reference values print.
 */
import { readFile } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const args = process.argv.slice(2), value = key => args[args.indexOf(key) + 1];
assert.ok(args.includes('--manifest') && args.includes('--replacements'), 'Explicit private manifest and replacement paths required');
const manifestPath = resolve(value('--manifest')), replacementPath = resolve(value('--replacements'));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const replacements = JSON.parse(await readFile(replacementPath, 'utf8')).replacements;
const baseline = resolve(dirname(manifestPath), '..');
const objects = manifest.public_objects.filter(o => o.bucket === 'message_images');
const references = manifest.selected_row_remote_references.filter(r => r.table === 'messages' && JSON.stringify(r.field_path) === '["image_url"]');
assert.equal(objects.length, 13, 'This baseline expects exactly13 original message images');
assert.equal(references.length, 13, 'This baseline expects exactly13 mapped references');
const sha = b => createHash('sha256').update(b).digest('hex');
for (const o of objects) {
  assert.equal(o.status, 'verified');assert.ok(Object.values(o.checks).every(x => x === true));
  const path = resolve(baseline, o.local_path); assert.ok(path.startsWith(baseline + sep));
  const bytes = await readFile(path); assert.equal(bytes.length, o.size);assert.equal(sha(bytes), o.sha256);
  assert.equal(o.sniffed_mimetype, 'image/jpeg');assert.ok(o.size <= 5 * 1024 * 1024);
}
const entries = references.map(r => {
  const o = objects.find(o => o.key === r.key);assert.ok(o && o.sha256 === r.sha256);
  const replacement = replacements.find(x => x.table === 'messages' && x.row_id === r.row_id && x.field === 'image_url');
  assert.ok(replacement, 'Exact prior local URL transformation required');
  assert.ok(replacement.bucket === o.bucket && replacement.key === o.key && replacement.expected_bytes_sha256 === o.sha256, 'Replacement must identify the same verified object');
  const localUrl = 'http://127.0.0.1:28622/storage/v1/object/public/message_images/' + o.key.split('/').map(encodeURIComponent).join('/');
  assert.ok(replacement.replacement_value === localUrl, 'Only the pinned prior local URL transformation is accepted');
  return { sourceTable: 'messages', sourceId: r.row_id, imageUrl: replacement.replacement_value,
    bucket: o.bucket, objectPath: o.key, mimeType: o.sniffed_mimetype, byteSize: o.size, sha256: o.sha256 };
});
if (!args.includes('--register') && !args.includes('--cutover')) {
  console.log(JSON.stringify({ offlineBytesVerified: objects.length, preparedReferences: entries.length, apiRequests: 0 }));
} else {
  assert.ok(args.includes('--status'), 'Explicit isolated runtime status required');
  assert.ok(!(args.includes('--register') && args.includes('--cutover')), 'Register and cutover are separate operations');
  const status = JSON.parse(await readFile(resolve(value('--status')), 'utf8'));
  assert.equal(status.runtime, 'native');assert.equal(status.env.API_URL, 'http://127.0.0.1:28622');
  assert.equal(new URL(status.env.DB_URL).hostname, '127.0.0.1');assert.equal(new URL(status.env.DB_URL).port, '20324');
  const api = status.env.API_URL, service = status.env.SERVICE_ROLE_KEY; assert.ok(service);
  const request = async (path, options = {}) => {
    const url = new URL(path, api);assert.equal(url.origin, api);
    assert.match(path, /^\/(rest|storage)\/v1\//);
    const r = await fetch(url, { ...options, headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json', ...options.headers },
      signal: AbortSignal.timeout(12000), redirect: 'error' });
    assert.ok(r.ok, `Local request failed: HTTP${r.status}`);return r;
  };
  // Read only the13 allowlisted existing objects, using service auth. Do not use
  // any URL from the manifest as a network target (including loopback URL fields).
  for (const o of objects) {
    const path = `/storage/v1/object/authenticated/message_images/${o.key.split('/').map(encodeURIComponent).join('/')}`;
    const r = await request(path);const bytes = Buffer.from(await r.arrayBuffer());
    assert.equal(bytes.length, o.size);assert.equal(sha(bytes), o.sha256);
  }
  for (const e of entries) {
    const rows = await (await request(`/rest/v1/messages?id=eq.${e.sourceId}&select=id,image_url`)).json();
    assert.equal(rows.length, 1);assert.ok(rows[0].image_url === e.imageUrl, 'Stored reference differs from the verified baseline transform');
  }
  if (args.includes('--register')) {
    const result = await (await request('/rest/v1/rpc/register_legacy_message_media', { method: 'POST', body: JSON.stringify({ p_entries: entries }) })).json();
    assert.ok(Number.isInteger(result.registered));console.log(JSON.stringify({ registered: result.registered, verifiedObjects: objects.length }));
  } else {
    assert.ok(args.includes('--endpoint-verified'), 'Verify the served endpoint and private participation checks before cutover');
    const result = await (await request('/rest/v1/rpc/cutover_legacy_message_media', { method: 'POST', body: '{}' })).json();
    assert.equal(result.legacyPrivate, true);console.log(JSON.stringify({ legacyPrivate: true, verifiedObjects: objects.length }));
  }
}
