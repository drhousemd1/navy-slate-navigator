#!/usr/bin/env node
/** Explicit operator command. prepare is offline; inspect/publish make only
 * authenticated requests to the explicitly selected target. No config inference. */
import { readFile, writeFile, lstat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { parseAdminDocumentManifest, verifyDocument } from '../src/features/admin-documents/manifest.ts';
import { parseHead, parseRevision, prepareRevision, publishRevision, readPublication, sha256 } from '../src/features/admin-documents/publication.ts';
import { createPublicationStore, publicationTarget } from '../src/features/admin-documents/storage.ts';

async function file(path, limit) {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size > limit) throw new Error('Invalid prepared file');
  return new Uint8Array(await readFile(path));
}
async function json(path, limit = 32768) { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await file(path, limit))); }
function require(ok, message) { if (!ok) throw new Error(message); }
const fields = (value, names) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join() === names.sort().join();

export async function prepareRequest({ targetUrl, local = false, expected, documentPath, publishedAt = new Date().toISOString() }) {
  const target = publicationTarget(targetUrl, local);
  require(fields(expected, ['target', 'local', 'head']) && expected.target === target && expected.local === local, 'Expected head belongs to another target');
  parseHead(expected.head);
  const source = resolve(documentPath), manifest = parseAdminDocumentManifest(await json(source));
  const htmlPath = resolve(dirname(source), manifest.object);
  await verifyDocument(new Blob([await file(htmlPath, 10 * 1024 * 1024)]), manifest.sha256);
  const bytes = prepareRevision(expected.head, manifest, publishedAt);
  return { format: 1, target, local, htmlPath, revisionBase64: Buffer.from(bytes).toString('base64'), revisionSha256: await sha256(bytes) };
}

export async function readPreparedRequest(path, targetUrl, local = false) {
  const value = await json(path);
  require(fields(value, ['format', 'target', 'local', 'htmlPath', 'revisionBase64', 'revisionSha256']) && value.format === 1 &&
    value.target === publicationTarget(targetUrl, local) && value.local === local && typeof value.htmlPath === 'string' &&
    typeof value.revisionBase64 === 'string' && /^[a-f0-9]{64}$/.test(value.revisionSha256), 'Prepared request target or shape changed');
  const bytes = new Uint8Array(Buffer.from(value.revisionBase64, 'base64'));
  require(Buffer.from(bytes).toString('base64') === value.revisionBase64 && await sha256(bytes) === value.revisionSha256, 'Prepared request bytes changed');
  const revision = parseRevision(bytes), html = await file(value.htmlPath, 10 * 1024 * 1024);
  await verifyDocument(new Blob([html]), revision.document.sha256);
  return { value, bytes, html };
}

function operatorStore(targetUrl, local) {
  const target = publicationTarget(targetUrl, local);
  const key = process.env.OBEDIENCE_PUBLICATION_SERVICE_KEY;
  require(typeof key === 'string' && key.length > 0, 'Set the operator credential in OBEDIENCE_PUBLICATION_SERVICE_KEY');
  let claims; try { claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')); } catch { throw new Error('Use the selected project legacy service-role credential'); }
  require(claims.role === 'service_role' && (local || claims.ref === new URL(target).hostname.split('.')[0]), 'Service-role credential target does not match');
  return createPublicationStore({ targetUrl: target, apiKey: key, bearer: key, local });
}

export async function main(args = process.argv.slice(2)) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
    'target-url': { type: 'string' }, local: { type: 'boolean', default: false },
    'expected-head': { type: 'string' }, document: { type: 'string' }, request: { type: 'string' },
  } });
  require(positionals.length === 1 && ['inspect', 'prepare', 'publish'].includes(positionals[0]) && values['target-url'],
    'Choose inspect, prepare or publish and an explicit --target-url; loopback also requires --local');
  const [mode] = positionals, target = publicationTarget(values['target-url'], values.local);
  if (mode === 'inspect') {
    require(!values['expected-head'] && !values.document && !values.request, 'Inspect accepts target inputs only');
    const publication = await readPublication(operatorStore(target, values.local));
    return { target, local: values.local, head: publication.head };
  }
  require(values.request, 'Use --request for the exclusive prepared request file');
  if (mode === 'prepare') {
    require(values['expected-head'] && values.document, 'Prepare requires --expected-head and --document');
    const prepared = await prepareRequest({ targetUrl: target, local: values.local,
      expected: await json(values['expected-head']), documentPath: values.document });
    await writeFile(resolve(values.request), JSON.stringify(prepared, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    return { prepared: true, target, requestSha256: prepared.revisionSha256, uploaded: false };
  }
  require(!values['expected-head'] && !values.document, 'Publish reuses only the frozen request; it never rebases');
  const prepared = await readPreparedRequest(values.request, target, values.local);
  const result = await publishRevision(operatorStore(target, values.local), prepared.bytes, prepared.html);
  return { target, ...result };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(result => console.log(JSON.stringify(result, null, 2))).catch(error => {
    // No response body, token, request body or file contents enter logs.
    console.error(error?.name === 'PublicationError' ? error.message : 'Publication preparation or verification failed. Check the explicit inputs and keep the same request file.');
    process.exitCode = 1;
  });
}
