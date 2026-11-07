import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'http://127.0.0.1:28622', supabasePublicKey: 'public', supabase: { auth: { getSession: vi.fn() } } }));
import { createThroneTransport, throneErrorText } from '@/data/throne/api';
import { cardActivity, decodeCards, imageSchema, newThroneDefinition, validateDefinition, MAX_CARD_BYTES, type ThroneIntent } from '@/data/throne/schema';
import { emptyCounts, projectActivity } from '@/data/metrics/projection';

const owner = '10000000-0000-4000-8000-000000000001', cardId = '20000000-0000-4000-8000-000000000001', commandId = '30000000-0000-4000-8000-000000000001';
const definition = () => ({ ...newThroneDefinition(), title: 'Personal progress' });
const card = () => ({ id: cardId, ownerId: owner, revision: 1, definition: definition() });
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const image = () => ({ dataUrl: png, metadata: { originalSize: 100, compressedSize: atob(png.split(',')[1]).length, compressionRatio: 30,
  originalDimensions: { width: 1, height: 1 }, compressedDimensions: { width: 1, height: 1 }, timestamp: '2026-11-07T00:00:00.000Z' } });
const intent = (): ThroneIntent => ({ cardId, commandId, expectedRevision: 0, kind: 'save', definition: definition() });
const receipt = () => ({ cardId, commandId, revision: 1, deleted: false, replayed: false });
const session = vi.fn(), fetcher = vi.fn();
const make = () => createThroneTransport({ backend: 'http://127.0.0.1:28622', publicKey: 'public', session, fetch: fetcher, timeoutMs: 30 });
beforeEach(() => { session.mockReset().mockResolvedValue({ accountId: owner, token: 'captured-token' }); fetcher.mockReset().mockResolvedValue(Response.json(receipt())); });
describe('personal Throne definitions', () => {
  it('preserves zero/null, five exact nullable positions, explicit alpha color and metadata', () => {
    const value = { ...definition(), images: [null, image(), null, null, image()], opacity: 0, focalX: 0, focalY: null, titleColor: '#22C55E80', iconColor: null };
    expect(validateDefinition(value)).toEqual(value);
    expect(decodeCards([{ ...card(), definition: value }], owner)[0].definition).toEqual(value);
  });
  it.each([[], [null], [null, null, null, null, null, null]])('rejects changed slot topology %#', images => {
    expect(() => validateDefinition({ ...definition(), images })).toThrow();
  });
  it('rejects unowned/duplicated reads and unrecorded usage fields', () => {
    expect(() => decodeCards([{ ...card(), ownerId: commandId }], owner)).toThrow();
    expect(() => decodeCards([card(), card()], owner)).toThrow();
    expect(() => validateDefinition({ ...definition(), usage_data: [1, 0, 1] })).toThrow();
  });
  it.each(['https://external.invalid/pic.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,YWJjZA=='])('rejects arbitrary external/active/invalid media %s', dataUrl => {
    expect(imageSchema.safeParse({ ...image(), dataUrl }).success).toBe(false);
  });
  it('rejects binary-size and dimension mismatches and bounds total before sending', () => {
    expect(imageSchema.safeParse({ ...image(), metadata: { ...image().metadata, compressedSize: 1 } }).success).toBe(false);
    expect(imageSchema.safeParse({ ...image(), metadata: { ...image().metadata, compressedDimensions: { width: 1921, height: 1080 } } }).success).toBe(false);
    expect(() => validateDefinition({ ...definition(), title: 'x'.repeat(MAX_CARD_BYTES) })).toThrow('CARD_TOO_LARGE');
  });
  it('accepts only safe literal colors and mutually exclusive icons', () => {
    for (const titleColor of ['red', 'url(https://example.invalid)', '#12345']) expect(() => validateDefinition({ ...definition(), titleColor })).toThrow();
    expect(() => validateDefinition({ ...definition(), icon: image(), iconName: 'Star' })).toThrow();
  });
});
describe('same dashboard activity projection', () => {
  it('shows only recorded selected series and saved-role calendar dates', () => {
    const metrics = projectActivity({ mode: 'legacy', events: [], legacy: [{ id: '1', kind: 'task', role: 'sub', recordedAt: '2026-11-04T12:00:00Z' }, { id: '2', kind: 'task', role: 'dom', recordedAt: '2026-11-04T12:00:00Z' }] },
      [{ role: 'sub', timeZone: 'UTC', start: '2026-11-02', end: '2026-11-09' }, { role: 'dom', timeZone: 'Pacific/Kiritimati', start: '2026-11-09', end: '2026-11-16' }]);
    expect(cardActivity(metrics, 'subTasksCompleted')?.total).toBe(1);
    expect(cardActivity(metrics, 'subTasksCompleted')?.days).toHaveLength(7);
    expect(cardActivity(metrics, 'domTasksCompleted')?.total).toBe(0);
    expect(cardActivity(metrics, 'domTasksCompleted')?.days[0].date).toBe('2026-11-09');
    expect(cardActivity({ ...metrics, ranges: [] }, 'domTasksCompleted')).toBeNull();
    expect(metrics.totals).toEqual({ ...emptyCounts(), subTasksCompleted: 1 });
  });
});
describe('account-captured Throne transport', () => {
  it('uses the selected backend, captured JWT, actor and exact complete definition', async () => {
    await expect(make().write(owner, intent())).resolves.toEqual(receipt());
    const [url, request] = fetcher.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:28622/rest/v1/rpc/commit_throne_card');
    expect(request.redirect).toBe('error'); expect(request.headers.Authorization).toBe('Bearer captured-token');
    expect(JSON.parse(request.body)).toEqual({ p_actor: owner, p_card_id: cardId, p_command_id: commandId, p_expected_revision: 0, p_kind: 'save', p_definition: definition() });
  });
  it('never sends after an account change and rejects a response arriving after one', async () => {
    session.mockResolvedValueOnce({ accountId: commandId, token: 'other' });
    await expect(make().write(owner, intent())).rejects.toThrow('ACCOUNT_CHANGED'); expect(fetcher).not.toHaveBeenCalled();
    session.mockResolvedValueOnce({ accountId: owner, token: 'captured' }).mockResolvedValueOnce(null);
    await expect(make().write(owner, intent())).rejects.toThrow('ACCOUNT_CHANGED');
  });
  it.each([{ ...receipt(), revision: 2 }, { ...receipt(), commandId: cardId }, { ...receipt(), deleted: true }, {}])('rejects mismatched success receipt %#', async value => {
    fetcher.mockResolvedValue(Response.json(value)); await expect(make().write(owner, intent())).rejects.toThrow('SAVE_UNCONFIRMED');
  });
  it('bounds an unresolved response and replays the identical command, never a fresh ID', async () => {
    const api = make(), same = intent(); fetcher.mockImplementationOnce(() => new Promise(() => {}));
    await expect(api.write(owner, same)).rejects.toThrow('SAVE_UNCONFIRMED'); expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
    fetcher.mockResolvedValue(Response.json({ ...receipt(), replayed: true })); await api.write(owner, same);
    expect(fetcher.mock.calls[0][1].body).toBe(fetcher.mock.calls[1][1].body);
  });
  it('reports a revision conflict specifically without leaking server error content', async () => {
    fetcher.mockResolvedValue(Response.json({ message: 'CARD_REVISION_CONFLICT', details: 'private' }, { status: 409 }));
    const failure = await make().write(owner, intent()).catch(error => error);
    expect(failure.definitive).toBe(true); expect(throneErrorText(failure)).toContain('changed elsewhere'); expect(throneErrorText(failure)).not.toContain('private');
  });
  it('reads only verified cards and does not include caller-selected partner scope', async () => {
    fetcher.mockResolvedValue(Response.json([card()])); expect(await make().read(owner)).toEqual([card()]);
    expect(fetcher.mock.calls[0][1].body).toBe('{}');
  });
  it('validates before sending and aborts an already-cancelled operation', async () => {
    await expect(make().write(owner, { ...intent(), definition: { ...definition(), opacity: -1 } })).rejects.toThrow();
    const abort = new AbortController(); abort.abort(); await expect(make().write(owner, intent(), abort.signal)).rejects.toThrow(); expect(fetcher).not.toHaveBeenCalled();
  });
});
