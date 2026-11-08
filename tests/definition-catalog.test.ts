import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readDefinitionCatalog, type DefinitionCatalog } from '@/data/actions/definitionCatalog';

const mocks = vi.hoisted(() => ({ network: vi.fn(), rows: [] as any[], calls: [] as URL[],
  duringFull: null as (() => Promise<void>) | null, failure: false, active: 0, maximum: 0 }));
vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return { supabase: createClient('https://catalog.invalid', 'fixture-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: mocks.network },
  }) };
});
const scope = { backendId: 'https://catalog.invalid', accountId: 'account', participantId: 'participant', relationshipId: 'period', relationshipSessionId: 'session' };
const fields = 'id,relationship_id,updated_at,deleted_at,title,background_image_url';
type Row = { id: string; relationship_id: string; updated_at: string | null; deleted_at: string | null; title: string; background_image_url: string };
const row = (id = 'one'): Row => ({ id, relationship_id: 'period', updated_at: '2026-11-08T10:00:00.000001+00:00', deleted_at: null, title: 'Original', background_image_url: 'large-artwork' });
const read = (previous?: DefinitionCatalog<Row>, signal?: AbortSignal, current = scope, table: 'rewards' | 'rules' | 'tasks' = 'rewards') =>
  readDefinitionCatalog<Row>(table, fields, current, 'fixture-token', signal, () => previous, 'Could not load.');
const fullReads = () => mocks.calls.filter(url => url.searchParams.get('select') === fields);
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
beforeEach(() => {
  mocks.rows = [row()]; mocks.calls = []; mocks.duringFull = null; mocks.failure = false; mocks.active = 0; mocks.maximum = 0;
  mocks.network.mockReset().mockImplementation(async (input: string, init: RequestInit) => {
    const url = new URL(input); mocks.calls.push(url);
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer fixture-token');
    expect(url.searchParams.get('relationship_id')).toBe('eq.period');
    const full = url.searchParams.get('select') === fields;
    if (full) {
      mocks.active++; mocks.maximum = Math.max(mocks.maximum, mocks.active);
      try { await mocks.duringFull?.(); } finally { mocks.active--; }
      if (mocks.failure) return response({ code: '57014', message: 'private server text', details: 'private row content' }, 500);
    }
    const columns = url.searchParams.get('select')!.split(',');
    const selected = mocks.rows.filter(item => !url.searchParams.has('id') || url.searchParams.get('id') === `eq.${item.id}`);
    return response(selected.map(item => Object.fromEntries(columns.filter(key => key in item).map(key => [key, item[key]]))));
  });
});

describe('scoped revision-aware definition reads through the real SDK', () => {
  it('reads full rows by primary key once, then only metadata while unchanged, including removed titles', async () => {
    mocks.rows.push({ ...row('removed'), deleted_at: '2026-11-08' });
    const cold = await read();
    expect(fullReads()).toHaveLength(2);
    expect(fullReads().map(url => url.searchParams.get('id'))).toEqual(['eq.one', 'eq.removed']);
    mocks.calls = [];
    const warm = await read(cold);
    expect(fullReads()).toHaveLength(0); expect(mocks.calls).toHaveLength(1);
    expect(warm.rows[0]).toBe(cold.rows[0]); expect(warm.rows[1].title).toBe('Original');
  });
  it('refreshes partner changes at microsecond precision, new rows and removals without reloading unchanged artwork', async () => {
    const cold = await read();
    mocks.rows = [{ ...row(), updated_at: '2026-11-08T10:00:00.000002+00:00', title: 'Partner edit', background_image_url: 'new-artwork' }, row('new')];
    mocks.calls = [];
    const changed = await read(cold);
    expect(changed.rows.map(item => item.title)).toEqual(['Partner edit', 'Original']); expect(fullReads()).toHaveLength(2);
    mocks.rows = [mocks.rows[1]]; mocks.calls = [];
    expect((await read(changed)).rows.map(item => item.id)).toEqual(['new']); expect(fullReads()).toHaveLength(0);
  });
  it.each([null, undefined, ''])('never reuses an absent or empty revision (%s)', async version => {
    mocks.rows[0].updated_at = version;
    const cold = await read(); mocks.calls = [];
    await read(cold); expect(fullReads()).toHaveLength(1);
  });
  it.each(['accountId', 'relationshipSessionId', 'participantId', 'backendId'] as const)('does not reuse another %s cache', async field => {
    const cold = await read(); mocks.calls = [];
    await read(cold, undefined, { ...scope, [field]: 'different' }); expect(fullReads()).toHaveLength(1);
  });
  it('rejects a revision changing between metadata and artwork instead of displaying mixed facts', async () => {
    mocks.duringFull = async () => { mocks.rows[0] = { ...row(), updated_at: '2026-11-08T10:00:01+00:00' }; };
    await expect(read()).rejects.toThrow('changed while loading');
  });
  it('rejects foreign relationship metadata and duplicate identities before loading artwork', async () => {
    mocks.rows[0].relationship_id = 'foreign'; await expect(read()).rejects.toThrow('different relationship');
    mocks.rows = [row(), row()]; await expect(read()).rejects.toThrow('could not be verified'); expect(fullReads()).toHaveLength(0);
  });
  it('limits simultaneous heavy reads across all catalogs and releases the slot after failure', async () => {
    mocks.duringFull = () => new Promise(resolve => setTimeout(resolve, 5));
    await Promise.all([read(), read(undefined, undefined, scope, 'rules'), read(undefined, undefined, scope, 'tasks')]);
    expect(mocks.maximum).toBe(1);
    mocks.failure = true; await expect(read()).rejects.toMatchObject({ message: 'Could not load.', cause: { operation: 'rewards', code: '57014', status: 500 } });
    mocks.failure = false; await expect(read()).resolves.toMatchObject({ rows: [row()] });
  });
  it('never starts an aborted queued artwork request and retains no private server error text', async () => {
    let release!: () => void;
    mocks.duringFull = () => new Promise(resolve => { release = resolve; });
    const first = read(); await vi.waitFor(() => expect(fullReads()).toHaveLength(1));
    const controller = new AbortController(); const queued = read(undefined, controller.signal);
    const rejected = expect(queued).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(mocks.calls).toHaveLength(3)); controller.abort(); release();
    await first; await rejected; expect(fullReads()).toHaveLength(1);
    mocks.duringFull = null; mocks.failure = true;
    try { await read(); throw new Error('Expected failure'); } catch (error) {
      expect(JSON.stringify(error)).not.toMatch(/private|row content/);
      expect((error as any).cause).toEqual({ operation: 'rewards', code: '57014', status: 500 });
    }
  });
});
