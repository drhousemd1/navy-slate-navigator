import React from 'react';
import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readCacheFactory } from './read-cache-fake';
const f = vi.hoisted(() => ({ query: vi.fn(), points: vi.fn(), mode: 'atomic', operations: vi.fn(), success: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://cache.invalid', supabase: { from: () => ({ select: () => ({ in: () => ({ order: f.query }), eq: () => ({ single: f.points }) }) }) } }));
vi.mock('@/contexts/ActionCommandsContext', () => ({ useActionCommands: () => ({ mode: f.mode }) }));
vi.mock('@/contexts/punishments/usePunishmentOperations', () => ({ usePunishmentOperations: f.operations }));
vi.mock('@/lib/toastManager', () => ({ toastManager: { success: f.success, error: vi.fn() } }));
vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
import { fetchPunishments } from '@/data/punishments/queries/fetchPunishments';
import { PunishmentsProvider } from '@/contexts/punishments/PunishmentsProvider';
import { prepareIdentityCacheScope, captureCacheToken, savePunishmentsToDB, loadPunishmentsFromDB, savePointsToDB, saveDomPointsToDB, legacyQueryKey, READ_CACHE_DATABASE, READ_CACHE_STORE } from '@/data/indexedDB/useIndexedDB';
import { useUserPointsQuery } from '@/data/points/useUserPointsQuery';
import { useUserDomPointsQuery } from '@/data/points/useUserDomPointsQuery';
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';
const scope = { backendId: 'https://cache.invalid', accountId: 'A', relationshipId: 'p1', relationshipSessionId: 's1' };
let fake: ReturnType<typeof readCacheFactory>;
beforeEach(async () => { localStorage.clear(); fake = readCacheFactory(); vi.stubGlobal('indexedDB', fake.factory); await prepareIdentityCacheScope(scope, ['A', 'D']); f.query.mockReset(); f.points.mockReset(); f.operations.mockReset().mockReturnValue({ punishments: [], getPunishmentHistory: () => [], refetchPunishmentsData: vi.fn() }); f.success.mockClear(); });
afterEach(cleanup);
describe('legacy cache consumer boundaries', () => {
  it.each(['atomic', 'loading', 'error', 'disabled'])('does not mount legacy punishment operations in %s mode', mode => { f.mode = mode; render(<PunishmentsProvider><p>content</p></PunishmentsProvider>); expect(f.operations).not.toHaveBeenCalled(); });
  it('retains the legacy provider in legacy mode', () => { f.mode = 'legacy'; render(<PunishmentsProvider><p>content</p></PunishmentsProvider>); expect(f.operations).toHaveBeenCalledOnce(); });
  it('uses a fresh empty snapshot without a server query', async () => {
    const token = captureCacheToken(); await savePunishmentsToDB([], token); expect(await fetchPunishments('A', 'D', token)).toEqual([]); expect(f.query).not.toHaveBeenCalled();
  });
  it('does not save or return a late response under the same accounts new session', async () => {
    let finish!: (data: unknown) => void; f.query.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const token = captureCacheToken(); const pending = fetchPunishments('A', 'D', token); const rejection = expect(pending).rejects.toThrow('changed');
    await waitFor(() => expect(f.query).toHaveBeenCalledOnce()); await prepareIdentityCacheScope({ ...scope, relationshipSessionId: 's2' }, ['A', 'D']);
    finish({ data: [{ id: 'p', user_id: 'A', title: 'old' }], error: null }); await rejection; expect(await loadPunishmentsFromDB(captureCacheToken())).toBeNull();
    expect(fake.rows(READ_CACHE_DATABASE, READ_CACHE_STORE).size).toBe(0);
  });
  it.each([
    ['Sub', useUserPointsQuery, savePointsToDB, 0],
    ['Dom', useUserDomPointsQuery, saveDomPointsToDB, -7],
  ] as const)('keeps the fresh %s server balance when a device snapshot write fails', async (_name, usePoints, save, value) => {
    await save(19, captureCacheToken(), 'A'); fake.control.failWrite = true;
    f.points.mockResolvedValue({ data: { points: value, dom_points: value }, error: null });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const hook = renderHook(() => usePoints('A'), { wrapper: ({ children }: React.PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(hook.result.current.data).toBe(value); expect(f.points).toHaveBeenCalledOnce();
  });
  it('keeps a mutation request token through an options rerender and suppresses late cache/UI writes', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } }); let finish!: (value: { id: string }) => void;
    const request = vi.fn(() => new Promise<{ id: string }>(resolve => { finish = resolve; })); const callback = vi.fn(); const oldToken = captureCacheToken();
    const wrapper = ({ children }: React.PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const hook = renderHook(() => useCreateOptimisticMutation({ cacheToken: captureCacheToken(), queryClient: client, queryKey: legacyQueryKey(['tasks']), entityName: 'Task', mutationFn: request, createOptimisticItem: (_v: { title: string }, id) => ({ id }), onSuccessCallback: callback }), { wrapper });
    let pending!: Promise<unknown>; act(() => { pending = hook.result.current.mutateAsync({ title: 'old' }); }); await waitFor(() => expect(request).toHaveBeenCalledOnce());
    await prepareIdentityCacheScope({ ...scope, relationshipSessionId: 's2' }, ['A', 'D']); client.removeQueries(); hook.rerender();
    await act(async () => { finish({ id: 'server' }); await pending; });
    expect(callback).not.toHaveBeenCalled(); expect(f.success).not.toHaveBeenCalled(); expect(client.getQueryData(legacyQueryKey(['tasks']))).toBeUndefined(); expect(client.getQueryData(legacyQueryKey(['tasks'], oldToken))).toBeUndefined();
  });
});
