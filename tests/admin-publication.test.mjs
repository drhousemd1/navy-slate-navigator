import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPublicationStore, publicationTarget } from '../src/features/admin-documents/storage.ts';
import { readPublication, publishRevision, prepareRevision, revisionPath, sha256 } from '../src/features/admin-documents/publication.ts';
import { main, prepareRequest, readPreparedRequest } from '../scripts/publish-admin-document.mjs';

const target = 'http://127.0.0.1:28622', time = '2026-11-07T12:00:00Z';
const enc = value => new TextEncoder().encode(value), response = (value, status = 200) => Response.json(value, { status });
async function document(version) {
  const bytes = enc(`<!doctype html><title>Private plan</title><p>${version}: pending</p>`), hash = await sha256(bytes);
  return { bytes, manifest: { version, title: 'Rebuild plan', updatedAt: time, object: `plan-${hash}.html`, sha256: hash } };
}
async function fixture(namespace = '', bearer = 'synthetic') {
  const original = await document('v1'), prefix = namespace ? namespace + '/' : '';
  const objects = new Map([[prefix + 'current.json', enc(JSON.stringify(original.manifest))], [prefix + original.manifest.object, original.bytes]]);
  const state = { listStatus: 200, readStatus: 200, failHtml: false, loseReply: '', race: '', waiters: [], calls: [], objects, prefix };
  const fetch = async (input, init) => {
      const url = new URL(input), method = init.method ?? 'GET';
      state.calls.push({ path: url.pathname, method, init });
      assert.equal(url.origin, target); assert.equal(init.redirect, 'error'); assert.equal(init.cache, 'no-store');
      assert.equal(init.headers.Authorization, `Bearer ${bearer}`);
      if (url.pathname === '/storage/v1/object/list/admin-documents') {
        if (state.listStatus !== 200) return response({ error: 'denied' }, state.listStatus);
        const q = JSON.parse(init.body); assert.equal(q.prefix, prefix + 'revisions/'); assert.deepEqual(q.sortBy, { column: 'name', order: 'asc' });
        const names = [...objects.keys()].filter(key => key.startsWith(q.prefix)).sort().slice(q.offset, q.offset + q.limit);
        return response(names.map(key => ({ name: key.slice(q.prefix.length), id: 'synthetic-object' })));
      }
      const path = decodeURIComponent(url.pathname.replace(/^\/storage\/v1\/object\/(?:authenticated\/)?admin-documents\//, ''));
      assert.ok(path.startsWith(prefix));
      if (method === 'GET') {
        assert.ok(url.searchParams.has('cacheNonce'));
        if (state.readStatus !== 200) return response({}, state.readStatus);
        return objects.has(path) ? new Response(objects.get(path)) : response({ statusCode: '404' }, 400);
      }
      assert.equal(method, 'POST'); assert.equal(init.headers['x-upsert'], 'false');
      if (path.endsWith('.html') && state.failHtml) throw new Error('injected HTML transport failure');
      if (path === prefix + state.race) await new Promise(resolve => { state.waiters.push(resolve); if (state.waiters.length === 2) state.waiters.forEach(done => done()); });
      if (objects.has(path)) return response({ statusCode: '409', error: 'Duplicate' }, 400);
      objects.set(path, new Uint8Array(init.body));
      if (path === prefix + state.loseReply) { state.loseReply = ''; throw new Error('injected lost reply after commit'); }
      return response({ Key: path });
    };
  const store = createPublicationStore({ targetUrl: target, local: true, namespace, apiKey: bearer, bearer, fetch });
  return { store, state, original, fetch };
}
async function candidate(store, version) {
  const doc = await document(version), head = (await readPublication(store)).head;
  return { doc, bytes: prepareRevision(head, doc.manifest, time) };
}

test('legacy genesis remains readable and publisher never overwrites it', async () => {
  const { store, state, original } = await fixture();
  assert.equal((await readPublication(store)).manifest.version, 'v1');
  const update = await candidate(store, 'v2');
  const result = await publishRevision(store, update.bytes, update.doc.bytes);
  assert.equal(result.head.sequence, 1); assert.equal(result.current, true);
  assert.equal((await readPublication(store)).manifest.version, 'v2');
  assert.deepEqual(state.objects.get('current.json'), enc(JSON.stringify(original.manifest)));
  await assert.rejects(store.create('current.json', update.bytes, 'application/json'), /cannot be replaced/);
});

test('concurrent publishers contend for exactly one slot; loser never rebases', async () => {
  const { store, state } = await fixture(), a = await candidate(store, 'v2a'), b = await candidate(store, 'v2b');
  state.race = revisionPath(1);
  const results = await Promise.allSettled([publishRevision(store, a.bytes, a.doc.bytes), publishRevision(store, b.bytes, b.doc.bytes)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.code, 'conflict');
  assert.equal(state.objects.has(revisionPath(2)), false);
  assert.equal([...state.objects.keys()].filter(x => x.startsWith('revisions/')).length, 1);
});

test('lost reply resolves exact bytes; later retry reports accepted without claiming current', async () => {
  const { store, state } = await fixture(), a = await candidate(store, 'v2');
  state.loseReply = revisionPath(1);
  assert.equal((await publishRevision(store, a.bytes, a.doc.bytes)).committed, true);
  const b = await candidate(store, 'v3'); await publishRevision(store, b.bytes, b.doc.bytes);
  const retry = await publishRevision(store, a.bytes, a.doc.bytes);
  assert.deepEqual([retry.committed, retry.replayed, retry.current, retry.head.sequence], [true, true, false, 1]);
  assert.equal(state.objects.has(revisionPath(3)), false);
});

test('failed HTML upload leaves prior selection intact; rollback appends old verified HTML', async () => {
  const { store, state, original } = await fixture(), update = await candidate(store, 'v2');
  state.failHtml = true;
  await assert.rejects(publishRevision(store, update.bytes, update.doc.bytes));
  assert.equal(state.objects.has(revisionPath(1)), false);
  assert.equal((await readPublication(store)).manifest.version, 'v1');
  state.failHtml = false; await publishRevision(store, update.bytes, update.doc.bytes);
  const rollback = prepareRevision((await readPublication(store)).head, original.manifest, time);
  await publishRevision(store, rollback, original.bytes);
  const restored = await readPublication(store);
  assert.equal(restored.head.sequence, 2); assert.equal(restored.manifest.version, 'v1');
  assert.ok(state.objects.has(revisionPath(1))); assert.ok(state.objects.has(update.doc.manifest.object));
});

test('listing/permission/network errors never become an empty revision history', async () => {
  for (const status of [401, 403, 500]) {
    const { store, state } = await fixture(); state.listStatus = status;
    await assert.rejects(readPublication(store), error => error.code === (status === 500 ? 'storage' : 'access'));
    assert.equal(state.calls.some(c => c.path.endsWith('.html')), false);
  }
});

test('gaps, changed predecessor hashes, noncanonical names and replaced genesis fail closed', async () => {
  for (const kind of ['gap', 'hash', 'name', 'genesis']) {
    const { store, state } = await fixture(), update = await candidate(store, 'v2');
    if (kind === 'gap') state.objects.set(revisionPath(2), update.bytes);
    if (kind === 'name') state.objects.set('revisions/current.json', update.bytes);
    if (kind === 'hash') { const value = JSON.parse(new TextDecoder().decode(update.bytes)); value.previous.sha256 = 'a'.repeat(64); state.objects.set(revisionPath(1), enc(JSON.stringify(value))); }
    if (kind === 'genesis') { await publishRevision(store, update.bytes, update.doc.bytes); state.objects.set('current.json', enc(JSON.stringify({ ...update.doc.manifest, title: 'Replaced anchor' }))); }
    await assert.rejects(readPublication(store), { code: 'integrity' }, kind);
  }
});

test('all canonical pages are read and selected document corruption is rejected', async () => {
  const { store, state, original } = await fixture();
  let head = (await readPublication(store)).head;
  for (let sequence = 1; sequence <= 101; sequence++) {
    const bytes = prepareRevision(head, original.manifest, time); state.objects.set(revisionPath(sequence), bytes);
    head = { ...head, sequence, sha256: await sha256(bytes) };
  }
  state.calls.length = 0;
  assert.equal((await readPublication(store)).head.sequence, 101);
  assert.deepEqual(state.calls.filter(c => c.path.includes('/list/')).map(c => JSON.parse(c.init.body).offset), [0, 100]);
  state.objects.set(original.manifest.object, enc('changed'));
  await assert.rejects(readPublication(store), /does not match/);
});

test('actual adapter confines rehearsal paths and rejects unsafe credential destinations', async () => {
  const { store, state } = await fixture('rehearsals/12345678-1234-4234-8234-123456789012');
  const update = await candidate(store, 'v2'); await publishRevision(store, update.bytes, update.doc.bytes);
  assert.ok([...state.objects.keys()].every(path => path.startsWith(state.prefix)));
  for (const value of ['https://example.com', 'https://ronqvzihpffgowyscgfm.supabase.co/path', 'https://a@ronqvzihpffgowyscgfm.supabase.co',
    'https://ronqvzihpffgowyscgfm.supabase.co?x=1', 'https://ronqvzihpffgowyscgfm.supabase.co#x', target])
    assert.throws(() => publicationTarget(value));
  assert.equal(publicationTarget(target, true), target);
  assert.throws(() => createPublicationStore({ targetUrl: target, local: true, namespace: '../other', apiKey: 'x', bearer: 'x' }));
});

test('operator prepare is offline/exclusive and retries keep frozen bytes and target', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'obedience-publication-test-'));
  try {
    const { store } = await fixture(), next = await document('v2');
    const expected = { target, local: true, head: (await readPublication(store)).head };
    const manifestPath = join(directory, 'document.json'), headPath = join(directory, 'head.json'), requestPath = join(directory, 'request.json');
    await writeFile(manifestPath, JSON.stringify(next.manifest)); await writeFile(join(directory, next.manifest.object), next.bytes); await writeFile(headPath, JSON.stringify(expected));
    const args = ['prepare', '--target-url', target, '--local', '--expected-head', headPath, '--document', manifestPath, '--request', requestPath];
    const result = await main(args); assert.equal(result.uploaded, false);
    const prepared = await readPreparedRequest(requestPath, target, true), raw = await readFile(requestPath);
    assert.equal(prepared.value.revisionSha256, result.requestSha256);
    await assert.rejects(main(args), { code: 'EEXIST' }); assert.deepEqual(await readFile(requestPath), raw);
    await assert.rejects(readPreparedRequest(requestPath, 'http://127.0.0.1:25104', true));
    await writeFile(join(directory, next.manifest.object), enc('changed'));
    await assert.rejects(readPreparedRequest(requestPath, target, true), /does not match/);
    await assert.rejects(prepareRequest({ targetUrl: target, local: true, expected: { ...expected, target: 'http://127.0.0.1:25104' }, documentPath: manifestPath }));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('operator inspect/prepare/publish use the shared adapter and exact retry without credential artifacts', async context => {
  const directory = await mkdtemp(join(tmpdir(), 'obedience-publication-cli-test-'));
  const previous = process.env.OBEDIENCE_PUBLICATION_SERVICE_KEY;
  const key = `synthetic.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.synthetic`;
  process.env.OBEDIENCE_PUBLICATION_SERVICE_KEY = key;
  try {
    const f = await fixture('', key); context.mock.method(globalThis, 'fetch', f.fetch);
    const expected = await main(['inspect', '--target-url', target, '--local']);
    const next = await document('v2'), documentPath = join(directory, 'document.json'), headPath = join(directory, 'head.json'), requestPath = join(directory, 'request.json');
    await writeFile(documentPath, JSON.stringify(next.manifest)); await writeFile(join(directory, next.manifest.object), next.bytes); await writeFile(headPath, JSON.stringify(expected));
    await main(['prepare', '--target-url', target, '--local', '--expected-head', headPath, '--document', documentPath, '--request', requestPath]);
    const frozen = await readFile(requestPath, 'utf8'); assert.equal(frozen.includes(key), false);
    const args = ['publish', '--target-url', target, '--local', '--request', requestPath];
    f.state.loseReply = revisionPath(1);
    assert.equal((await main(args)).committed, true); assert.equal((await main(args)).replayed, true);
    assert.equal((await main(['inspect', '--target-url', target, '--local'])).head.sequence, 1);
    assert.equal(await readFile(requestPath, 'utf8'), frozen); assert.equal(f.state.objects.has(revisionPath(2)), false);
  } finally {
    if (previous === undefined) delete process.env.OBEDIENCE_PUBLICATION_SERVICE_KEY; else process.env.OBEDIENCE_PUBLICATION_SERVICE_KEY = previous;
    await rm(directory, { recursive: true, force: true });
  }
});

test('operator rejects missing or mismatched credential and unsafe target before any request', async context => {
  const previous = process.env.OBEDIENCE_PUBLICATION_SERVICE_KEY;
  const fetch = context.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected network request'); });
  try {
    delete process.env.OBEDIENCE_PUBLICATION_SERVICE_KEY;
    await assert.rejects(main(['inspect', '--target-url', target, '--local']));
    process.env.OBEDIENCE_PUBLICATION_SERVICE_KEY = `synthetic.${Buffer.from(JSON.stringify({ role: 'service_role', ref: 'abcdefghijklmnopqrst' })).toString('base64url')}.synthetic`;
    await assert.rejects(main(['inspect', '--target-url', 'https://tsrqponmlkjihgfedcba.supabase.co']), /target does not match/);
    await assert.rejects(main(['inspect', '--target-url', 'https://example.com']));
    await assert.rejects(main(['inspect', '--target-url', target]));
    await assert.rejects(main(['inspect', '--target-url', target, '--local', '--credential', 'forbidden']));
    assert.equal(fetch.mock.callCount(), 0);
  } finally { if (previous === undefined) delete process.env.OBEDIENCE_PUBLICATION_SERVICE_KEY; else process.env.OBEDIENCE_PUBLICATION_SERVICE_KEY = previous; }
});
