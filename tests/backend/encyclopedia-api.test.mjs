import test from 'node:test';
import assert from 'node:assert/strict';
import { openEncyclopediaFixture, syntheticDoc, syntheticImage } from './encyclopedia-fixture.mjs';
const reviewed = process.env.OBEDIENCE_ENCYCLOPEDIA_API_REVIEWED === '1';
const retention = process.env.OBEDIENCE_ENCYCLOPEDIA_DELETE_EDITOR_AFTER_UI === '1';
const knownRejections = new Set(['AUTHENTICATION_REQUIRED', 'EDITOR_REQUIRED', 'ACCOUNT_UNAVAILABLE', 'INVALID_INPUT', 'REQUEST_TOO_LARGE', 'ENTRY_NOT_FOUND', 'ENTRY_REVISION_CONFLICT', 'COMMAND_ID_REUSED', 'ENTRY_ID_REUSED', 'SAVE_UNCONFIRMED', 'IMAGE_INVALID', 'IMAGE_SIZE_INVALID']);
const denied = (r, code) => {
  const actual = r.data?.error?.code ?? r.data?.message;
  const diagnostic = `status=${r.status}, code=${knownRejections.has(actual) ? actual : 'unrecognized'}`;
  assert.ok(r.status >= 400 && r.status < 500, `Expected client rejection (${diagnostic})`);
  if (code) assert.ok(actual === code, `Expected ${code} (${diagnostic})`);
  if (code === 'ENTRY_REVISION_CONFLICT') assert.equal(r.status, 409, `Expected revision conflict (${diagnostic})`);
};
const initialPatch = () => ({ title: 'Synthetic Encyclopedia acceptance', subtext: '', contentDocument: syntheticDoc, image: { op: 'replace', dataUrl: syntheticImage }, focalPointX: 0, focalPointY: null, opacity: 0, popupOpacity: null, highlightEffect: false, titleColor: null });

test('Encyclopedia permissions, exact values, idempotency, conflicts and deletion', { skip: !reviewed || retention, timeout: 240000 }, async t => {
  const f = await openEncyclopediaFixture();
  try {
    const id = await f.newEntry(), bypass = await f.newEntry(), create = await f.command(id, 0, initialPatch());
    denied(await f.request('POST', '/rest/v1/rpc/get_encyclopedia_library', f.anon, {}));
    denied(await f.request('GET', '/rest/v1/encyclopedia_entries?select=id', f.anon));
    assert.equal(f.ok(await f.rpc(f.b, 'get_encyclopedia_library')).canEdit, false);
    denied(await f.edge(f.a, 'save', create), 'EDITOR_REQUIRED');
    await f.grant(f.a);
    assert.equal(f.ok(await f.rpc(f.a, 'get_encyclopedia_library')).canEdit, true);
    for (const actor of [f.a, f.b]) {
      denied(await f.request('POST', '/rest/v1/encyclopedia_entries', actor.token, { id: bypass, title: 'Synthetic bypass probe', subtext: '' }));
      denied(await f.rpc(actor, 'encyclopedia_commit', { p_actor: actor.id, p_operation: 'save', p_command_id: create.commandId, p_entry_id: id, p_expected_revision: 0, p_patch: create.patch }));
      denied(await f.rpc(actor, 'encyclopedia_check_editor', { p_actor: actor.id }));
      denied(await f.request('POST', '/rest/v1/encyclopedia_editors', actor.token, { user_id: actor.id }));
    }
    const saved = f.ok(await f.edge(f.a, 'save', create)); assert.ok(saved.revision === 1 && !saved.replayed);
    const replay = f.ok(await f.edge(f.a, 'save', create)); assert.ok(replay.revision === 1 && replay.replayed);
    denied(await f.edge(f.a, 'save', { ...create, patch: { ...create.patch, title: 'Different intent' } }), 'COMMAND_ID_REUSED');
    let entry = f.ok(await f.rpc(f.b, 'get_encyclopedia_library')).entries.find(e => e.id === id);
    assert.ok(entry && entry.revision === 1 && entry.focal_point_x === 0 && entry.focal_point_y === null && entry.opacity === 0 && entry.popup_opacity === null && entry.highlight_effect === false && entry.title_color === null);
    assert.equal(entry.image_url, syntheticImage); assert.deepEqual(entry.contentDocument, syntheticDoc); const metadata = entry.image_meta;
    denied(await f.request('PATCH', `/rest/v1/encyclopedia_entries?id=eq.${id}`, f.b.token, { title: 'Synthetic bypass update' }));
    denied(await f.request('DELETE', `/rest/v1/encyclopedia_entries?id=eq.${id}`, f.a.token));
    f.ok(await f.edge(f.a, 'save', await f.command(id, 1, { subtext: 'Metadata-only edit' })));
    entry = f.ok(await f.rpc(f.b, 'get_encyclopedia_library')).entries.find(e => e.id === id);
    assert.equal(entry.image_url, syntheticImage); assert.deepEqual(entry.image_meta, metadata); assert.equal(entry.focal_point_x, 0);
    const c1 = await f.command(id, 2, { title: 'Concurrent A' }), c2 = await f.command(id, 2, { title: 'Concurrent B' });
    const concurrent = await Promise.all([f.edge(f.a, 'save', c1), f.edge(f.a, 'save', c2)]);
    assert.equal(concurrent.filter(r => r.status === 200).length, 1); denied(concurrent.find(r => r.status !== 200), 'ENTRY_REVISION_CONFLICT');
    denied(await f.edge(f.a, 'save', await f.command(id, 3, { image: { op: 'replace', dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' } })), 'IMAGE_INVALID');
    await f.revoke(f.a); denied(await f.edge(f.a, 'save', await f.command(id, 3, { title: 'Revoked' })), 'EDITOR_REQUIRED'); await f.grant(f.a);
    denied(await f.edge(f.a, 'delete', await f.command(id, 2)), 'ENTRY_REVISION_CONFLICT');
    const deletion = await f.command(id, 3); assert.equal(f.ok(await f.edge(f.a, 'delete', deletion)).revision, 4);
    assert.equal(f.ok(await f.edge(f.a, 'delete', deletion)).replayed, true);
    denied(await f.edge(f.a, 'save', await f.command(id, 0, initialPatch())), 'ENTRY_ID_REUSED');
    assert.ok(!f.ok(await f.rpc(f.b, 'get_encyclopedia_library')).entries.some(e => e.id === id));
    const state = (await f.rows('encyclopedia_entry_state')).find(e => e.entry_id === id); assert.ok(state.deleted && state.content_document === null);
    const receipts = (await f.rows('encyclopedia_command_receipts')).filter(r => r.entry_id === id); assert.ok(receipts.every(r => !JSON.stringify(r).includes('data:image') && !Object.hasOwn(r, 'patch')));
    await f.verify();
  } finally { await f.cleanup(); t.diagnostic(`Exact synthetic library manifest: ${f.manifest}`); }
});

test('AFTER UI: frozen curator is denied and authored global article and inline image survive account deletion', { skip: !reviewed || !retention, timeout: 300000 }, async t => {
  const f = await openEncyclopediaFixture({ retention: true });
  try {
    await f.grant(f.a); const id = await f.newEntry(); f.ok(await f.edge(f.a, 'save', await f.command(id, 0, initialPatch())));
    const before = f.ok(await f.rpc(f.b, 'get_encyclopedia_library')).entries.find(e => e.id === id);
    await f.deleteEditorAfterUI();
    const after = f.ok(await f.rpc(f.b, 'get_encyclopedia_library')).entries.find(e => e.id === id);
    assert.deepEqual(after, before); assert.equal(after.image_url, syntheticImage);
    denied(await f.rpc(f.a, 'get_encyclopedia_library'), 'ACCOUNT_UNAVAILABLE');
    const staleBearer = await f.edge(f.a, 'save', await f.command(id, 1, { title: 'Synthetic removed curator probe' }));
    assert.equal(staleBearer.status, 401); denied(staleBearer, 'AUTHENTICATION_REQUIRED');
    await f.verify();
  } finally { await f.cleanup(); t.diagnostic(`Synthetic curator deletion manifest: ${f.manifest}; parent still owns normal fixture/job cleanup.`); }
});
