vi.mock('@/contexts/ColorSchemeContext', () => ({ useColorScheme: () => ({ currentScheme: 'default' }) }));
/* eslint-disable @typescript-eslint/no-explicit-any -- Mutable provider fixtures exercise the real consumers. */
import React, { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AtomicPunishmentsContent } from '@/components/punishments/AtomicPunishmentsContent';
import { useRandomPunishmentSelection } from '@/components/punishments/hooks/useRandomPunishmentSelection';
import { reviewRandomPunishments } from '@/components/punishments/hooks/randomPunishmentReview';
import { ActionCommandQueue } from '@/data/actions/queue';
import { deferred, MemoryQueueStore, TestConnection, punishmentContext, scope, uuid } from './action-queue.helpers';
const mocks = vi.hoisted(() => ({ state: null as any, actions: null as any, identity: null as any }));
vi.mock('@/data/recordings/useRecordingData', () => ({ useRecordingData: () => mocks.state }));
vi.mock('@/contexts/ActionCommandsContext', () => ({ useActionCommands: () => mocks.actions }));
vi.mock('@/contexts/UserIdsContext', () => ({ useUserIds: () => mocks.identity }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, supabaseBackendId: 'fixture' }));
vi.mock('@/components/common/PointsBubbles', () => ({ default: () => <div>Confirmed balances</div> }));
vi.mock('@/components/PunishmentEditor', () => ({ default: () => <div>Editor</div> }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), debug: vi.fn(), info: vi.fn() } }));
function fixture(points = 10, domPoints = 4) {
  const definition = { id: uuid(75), relationship_id: scope.relationshipId, deleted_at: null,
    title: 'Fixture punishment', description: 'Original description', points, dom_points: domPoints, dom_supply: 0,
    background_image_url: '/fixture.png', background_opacity: 0, focal_point_x: 0, focal_point_y: 100,
    icon_color: '#ffffff', title_color: '#ffffff', subtext_color: '#ffffff', calendar_color: '#ffffff', highlight_effect: false };
  const expectedContext = { ...punishmentContext(), subDeduction: points, domAward: domPoints,
    sub: { ...punishmentContext().sub, timeZone: 'Pacific/Kiritimati' },
    dom: domPoints > 0 ? { ...punishmentContext().dom!, localDate: '2026-10-25', weekStartDate: '2026-10-19' } : null };
  const progress = { subjectId: definition.id, subjectType: 'punishment', beneficiaryParticipantId: expectedContext.sub.participantId,
    ...expectedContext.sub, expectedContext, usageData: [1,0,0,0,0,0,0], currentCount: 1 };
  return { definitions: [definition], progress: [progress], events: [], points: [], imported: [] };
}
const advance = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(4000); }); };
const flush = async () => { await act(async () => {}); };
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Random Punishment' }));
const picker = () => within(screen.getByRole('dialog', { name: 'Random Punishment' }));
let queue: ActionCommandQueue | undefined;
beforeEach(() => {
  vi.useFakeTimers(); vi.spyOn(Math, 'random').mockReturnValue(0);
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  mocks.actions = { mode: 'atomic', scope: { ...scope }, entries: [], confirmed: [], enqueue: vi.fn().mockResolvedValue(undefined), retry: vi.fn(), cancelUnsent: vi.fn() };
  mocks.identity = { currentRole: 'sub', participantId: scope.participantId, permissions: { punishment_undo: 'both' } };
  mocks.state = { data: fixture(), identity: mocks.identity, actions: mocks.actions, canManage: true, actionReason: null,
    pending: false, isLoading: false, error: null, refresh: vi.fn().mockResolvedValue(undefined), save: vi.fn(), remove: vi.fn() };
});
afterEach(() => { cleanup(); queue?.dispose(); queue = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('restored Random Punishment through the real page consumer', () => {
  it('previews, rerolls and cancels without a command; preserves exact two-currency values, calendars and image zeros', async () => {
    render(<AtomicPunishmentsContent contentRef={{ current: {} }} />); open();
    expect(picker().getByRole('button', { name: 'Cancel' })).toBeTruthy();
    await advance();
    expect(picker().getByText('Sub balance: −10 points')).toBeTruthy();
    expect(picker().getByText('Dom balance: +4 points')).toBeTruthy();
    expect(picker().getByText('Sub actions: 2026-10-26 · Pacific/Kiritimati')).toBeTruthy();
    expect(picker().getByText('Dom award: 2026-10-25 · America/Boise')).toBeTruthy();
    const background = screen.getByRole('dialog').querySelector('[style*="background-image"]') as HTMLElement;
    expect(background.style.opacity).toBe('0'); expect(background.style.backgroundPosition).toBe('0% 100%');
    fireEvent.click(picker().getByRole('button', { name: 'Re-roll' })); await advance();
    expect(picker().getByText('Fixture punishment')).toBeTruthy(); // A single choice can be selected again.
    fireEvent.click(picker().getByRole('button', { name: 'Cancel' })); await advance();
    expect(screen.queryByRole('dialog')).toBeNull(); expect(mocks.actions.enqueue).not.toHaveBeenCalled();
    expect(mocks.state.data.progress[0].currentCount).toBe(1);
  });
  it('queues exactly one reviewed command on double confirmation and waits for durable storage before closing', async () => {
    const save = deferred<void>(); mocks.actions.enqueue.mockReturnValue(save.promise);
    render(<AtomicPunishmentsContent contentRef={{ current: {} }} />); open(); await advance();
    const apply = picker().getByRole('button', { name: 'Apply Punishment' });
    fireEvent.click(apply); fireEvent.click(apply);
    expect(mocks.actions.enqueue).toHaveBeenCalledExactlyOnceWith({ kind: 'punishment_apply', punishmentId: uuid(75), expectedContext: mocks.state.data.progress[0].expectedContext });
    expect(picker().getByRole('button', { name: 'Saving action…' }).hasAttribute('disabled')).toBe(true);
    expect(picker().getByRole('button', { name: 'Cancel' }).hasAttribute('disabled')).toBe(true);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); expect(screen.getByRole('dialog')).toBeTruthy();
    await act(async () => { save.resolve(); });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText(/The action was saved on this device/)).toBeNull();
    expect(screen.queryByText('Punishment recorded')).toBeNull(); expect(mocks.state.data.progress[0].currentCount).toBe(1);
  });
  it('keeps the preview on durable-write failure and allows a deliberate retry', async () => {
    mocks.actions.enqueue.mockRejectedValueOnce(new Error('Device storage unavailable'));
    render(<AtomicPunishmentsContent contentRef={{ current: {} }} />); open(); await advance();
    fireEvent.click(picker().getByRole('button', { name: 'Apply Punishment' })); await flush();
    expect(picker().getByRole('alert').textContent).toBe('Device storage unavailable');
    expect(picker().getByText('Fixture punishment')).toBeTruthy();
    fireEvent.click(picker().getByRole('button', { name: 'Apply Punishment' })); await flush();
    expect(mocks.actions.enqueue).toHaveBeenCalledTimes(2); expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('shows zero effects exactly and permits zero legacy supply, just like ordinary Punish', async () => {
    mocks.state.data = fixture(0, 0);
    render(<AtomicPunishmentsContent contentRef={{ current: {} }} />); open(); await advance();
    expect(picker().getByText('Sub balance: 0 points')).toBeTruthy(); expect(picker().getByText('Dom balance: 0 points')).toBeTruthy();
    fireEvent.click(picker().getByRole('button', { name: 'Apply Punishment' })); await flush();
    expect(mocks.actions.enqueue.mock.calls[0][0].expectedContext).toMatchObject({ subDeduction: 0, domAward: 0 });
  });
  it.each(['points', 'title', 'calendar', 'deleted'] as const)('invalidates a reviewed selection when %s changes, without sending it', async change => {
    const ref = { current: {} }; const { rerender } = render(<AtomicPunishmentsContent contentRef={ref} />); open(); await advance();
    const next = fixture(change === 'points' ? 20 : 10);
    if (change === 'title') next.definitions[0].title = 'Changed title';
    if (change === 'calendar') { next.progress[0].localDate = '2026-10-27'; next.progress[0].expectedContext.sub.localDate = '2026-10-27'; }
    if (change === 'deleted') next.definitions = [];
    mocks.state.data = next; rerender(<AtomicPunishmentsContent contentRef={ref} />);
    expect(picker().queryByRole('button', { name: 'Apply Punishment' })).toBeNull();
    expect(mocks.actions.enqueue).not.toHaveBeenCalled();
    if (change !== 'deleted') {
      expect(picker().getByText(/details changed/)).toBeTruthy();
      fireEvent.click(picker().getByRole('button', { name: 'Pick again' })); await advance();
      fireEvent.click(picker().getByRole('button', { name: 'Apply Punishment' })); await flush();
      expect(mocks.actions.enqueue).toHaveBeenCalledExactlyOnceWith({ kind: 'punishment_apply', punishmentId: uuid(75), expectedContext: next.progress[0].expectedContext });
    } else expect(picker().getByText(/No punishments are available/)).toBeTruthy();
  });
  it('treats missing verified progress as a read error rather than using stale values', async () => {
    mocks.state.data.progress = [];
    render(<AtomicPunishmentsContent contentRef={{ current: {} }} />); open(); await advance();
    expect(picker().getByRole('alert').textContent).toMatch(/current punishment details could not be verified/);
    expect(picker().queryByRole('button', { name: 'Apply Punishment' })).toBeNull();
    expect(mocks.actions.enqueue).not.toHaveBeenCalled();
  });
  it('handles loading, empty, read failure and retry without fabricating a pick', async () => {
    mocks.state.data = undefined; mocks.state.isLoading = true;
    const ref = { current: {} }; const { rerender } = render(<AtomicPunishmentsContent contentRef={ref} />); open();
    expect(picker().getByText('Loading current punishments…')).toBeTruthy();
    mocks.state.isLoading = false; mocks.state.data = { ...fixture(), definitions: [] };
    rerender(<AtomicPunishmentsContent contentRef={ref} />); expect(picker().getByText(/No punishments are available/)).toBeTruthy();
    mocks.state.error = new Error('Read unavailable'); rerender(<AtomicPunishmentsContent contentRef={ref} />);
    expect(picker().getByRole('alert').textContent).toBe('Read unavailable');
    fireEvent.click(picker().getByRole('button', { name: 'Refresh punishments' })); await flush();
    expect(mocks.state.refresh).toHaveBeenCalledOnce();
    mocks.state.error = null; mocks.state.data = fixture(); rerender(<AtomicPunishmentsContent contentRef={ref} />); await advance();
    expect(picker().getByRole('button', { name: 'Apply Punishment' })).toBeTruthy(); expect(mocks.actions.enqueue).not.toHaveBeenCalled();
  });
  it('blocks denied permissions, pending/unknown commands, and a permission revoked while previewing', async () => {
    mocks.state.actionReason = 'Your relationship settings do not allow recording this action.';
    const ref = { current: {} }; const { rerender } = render(<AtomicPunishmentsContent contentRef={ref} />);
    expect(screen.getByRole('button', { name: 'Random Punishment' }).hasAttribute('disabled')).toBe(true);
    mocks.state.actionReason = null; mocks.state.pending = true; rerender(<AtomicPunishmentsContent contentRef={ref} />);
    expect(screen.getByRole('button', { name: 'Random Punishment' }).hasAttribute('disabled')).toBe(true);
    mocks.state.pending = false; rerender(<AtomicPunishmentsContent contentRef={ref} />); open(); await advance();
    mocks.state.actionReason = 'Your relationship settings do not allow recording this action.'; rerender(<AtomicPunishmentsContent contentRef={ref} />);
    expect(picker().queryByRole('button', { name: 'Apply Punishment' })).toBeNull();
    expect(picker().getByText(mocks.state.actionReason)).toBeTruthy(); expect(mocks.actions.enqueue).not.toHaveBeenCalled();
  });
  it.each(['accountId', 'relationshipId', 'relationshipSessionId', 'participantId', 'backendId', 'role'] as const)('closes on %s changes and never resurrects a preview on ABA', async field => {
    const ref = { current: {} }; const { rerender } = render(<AtomicPunishmentsContent contentRef={ref} />); open(); await advance();
    if (field === 'role') mocks.identity.currentRole = 'dom'; else mocks.actions.scope = { ...scope, [field]: uuid(999) };
    rerender(<AtomicPunishmentsContent contentRef={ref} />); expect(screen.queryByRole('dialog')).toBeNull();
    mocks.identity.currentRole = 'sub'; mocks.actions.scope = { ...scope }; rerender(<AtomicPunishmentsContent contentRef={ref} />);
    expect(screen.queryByRole('dialog')).toBeNull(); expect(mocks.actions.enqueue).not.toHaveBeenCalled();
  });
  it('ignores a late save from A after A → B → A without closing the new picker', async () => {
    const save = deferred<void>(); mocks.actions.enqueue.mockReturnValue(save.promise);
    const ref = { current: {} }; const { rerender } = render(<AtomicPunishmentsContent contentRef={ref} />); open(); await advance();
    fireEvent.click(picker().getByRole('button', { name: 'Apply Punishment' }));
    mocks.actions.scope = { ...scope, accountId: uuid(900) }; rerender(<AtomicPunishmentsContent contentRef={ref} />);
    mocks.actions.scope = { ...scope }; rerender(<AtomicPunishmentsContent contentRef={ref} />); open(); await advance();
    await act(async () => { save.resolve(); });
    expect(screen.getByRole('dialog')).toBeTruthy(); expect(screen.queryByText(/The action was saved on this device/)).toBeNull();
    expect(mocks.actions.enqueue).toHaveBeenCalledOnce();
  });
  it('uses the durable queue for offline save and same-command retry, then exposes confirmed History Undo', async () => {
    const store = new MemoryQueueStore(); const connection = new TestConnection();
    queue = new ActionCommandQueue({ store, connection, uuid: () => uuid(500), transport: { backendId: scope.backendId,
      execute: vi.fn(), recover: vi.fn() } }); queue.setContext(scope);
    mocks.actions.enqueue.mockImplementation(async (intent: any) => { await queue!.enqueue(intent); });
    mocks.actions.retry.mockImplementation((id: string) => queue!.retry(id));
    const ref = { current: {} }; const { rerender } = render(<AtomicPunishmentsContent contentRef={ref} />); open(); await advance();
    expect(await store.list()).toHaveLength(0);
    fireEvent.click(picker().getByRole('button', { name: 'Apply Punishment' })); await flush();
    const [saved] = await store.list(); expect(saved.command).toMatchObject({ commandId: uuid(500), kind: 'punishment_apply', expectedContext: mocks.state.data.progress[0].expectedContext });
    mocks.actions.entries = await queue.list(); mocks.state.pending = true; rerender(<AtomicPunishmentsContent contentRef={ref} />);
    expect(screen.getByText(/Pending; saved on this device/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry same action' })); await flush();
    expect(await store.list()).toHaveLength(1); expect((await store.list())[0].command.commandId).toBe(saved.command.commandId);
    await store.update(saved.command.commandId, row => ({ ...row, attempts: 1, everSent: true, state: { status: 'confirmation_unknown', command: row.command } }));
    mocks.actions.entries = await queue.list(); rerender(<AtomicPunishmentsContent contentRef={ref} />);
    expect(screen.getByText(/Confirmation unknown/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Random Punishment' }).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByText('Punishment recorded')).toBeNull();
    mocks.actions.entries = []; mocks.state.pending = false;
    mocks.state.data.events = [{ id: uuid(501), relationship_id: scope.relationshipId, punishment_id: uuid(75), rule_id: null,
      kind: 'punishment_applied', provenance: 'command', actor_participant_id: scope.participantId, subject: { title: 'Fixture punishment' },
      calendar: mocks.state.data.progress[0].expectedContext.sub, recorded_at: '2026-10-26T12:00:00Z', reverses_event_id: null }];
    mocks.actions.enqueue.mockResolvedValue(undefined); rerender(<AtomicPunishmentsContent contentRef={ref} />);
    fireEvent.click(screen.getByText('Punishment History')); fireEvent.click(screen.getByRole('button', { name: 'Undo punishment' })); await flush();
    expect(mocks.actions.enqueue).toHaveBeenLastCalledWith({ kind: 'undo', eventId: uuid(501) });
  });
});

describe('selection timer lifetime', () => {
  it('selects and rerolls immediately with reduced motion, using the same uniform choices and no cycling timer', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    const data = fixture();
    data.definitions.push({ ...data.definitions[0], id: uuid(76), title: 'Second punishment' });
    data.progress.push({ ...data.progress[0], subjectId: uuid(76), expectedContext: { ...data.progress[0].expectedContext, subjectId: uuid(76) } });
    const options = reviewRandomPunishments(data as any);
    vi.mocked(Math.random).mockReturnValue(0.99);
    const { result } = renderHook(() => useRandomPunishmentSelection(options, true));
    expect(result.current.selectedPunishment?.punishment.id).toBe(uuid(76));
    expect(result.current.isSelecting).toBe(false); expect(vi.getTimerCount()).toBe(0);
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    vi.mocked(Math.random).mockReturnValue(0);
    act(() => result.current.handleReroll());
    expect(result.current.selectedPunishment?.punishment.id).toBe(uuid(75));
    expect(vi.getTimerCount()).toBe(0); expect(Math.random).toHaveBeenCalledTimes(2);
    expect(mocks.actions.enqueue).not.toHaveBeenCalled();
  });
  it('can pick either eligible definition without point or legacy-supply weighting', async () => {
    const data = fixture();
    data.definitions.push({ ...data.definitions[0], id: uuid(76), title: 'Second punishment', dom_supply: 100 });
    data.progress.push({ ...data.progress[0], subjectId: uuid(76), expectedContext: { ...data.progress[0].expectedContext, subjectId: uuid(76) } });
    const options = reviewRandomPunishments(data as any);
    vi.mocked(Math.random).mockReturnValue(0.99);
    const { result } = renderHook(() => useRandomPunishmentSelection(options, true));
    expect(result.current.isSelecting).toBe(true); expect(result.current.selectedPunishment).toBeNull();
    await advance(); expect(result.current.selectedPunishment?.punishment.id).toBe(uuid(76));
    vi.mocked(Math.random).mockReturnValue(0);
    act(() => result.current.handleReroll()); await advance();
    expect(result.current.selectedPunishment?.punishment.id).toBe(uuid(75));
  });
  it('works under StrictMode and discards same-length changed options until an explicit new pick', async () => {
    const initial = reviewRandomPunishments(fixture() as any);
    const { result, rerender, unmount } = renderHook(({ options, open }) => useRandomPunishmentSelection(options, open),
      { initialProps: { options: initial, open: true }, wrapper: StrictMode });
    await advance(); expect(result.current.selectedPunishment?.punishment.id).toBe(uuid(75));
    const changed = reviewRandomPunishments(fixture(99) as any); rerender({ options: changed, open: true });
    expect(result.current.selectedPunishment).toBeNull(); expect(result.current.currentPunishment).toBeNull();
    await advance(); expect(result.current.selectedPunishment).toBeNull();
    act(() => result.current.handleReroll()); await advance(); expect(result.current.selectedPunishment?.expectedContext.subDeduction).toBe(99);
    act(() => result.current.handleReroll()); unmount(); const calls = vi.mocked(Math.random).mock.calls.length;
    await advance(); expect(Math.random).toHaveBeenCalledTimes(calls);
  });
  it('cancels an in-flight animation on close and starts a fresh preview on reopen', async () => {
    const options = reviewRandomPunishments(fixture() as any);
    const { result, rerender } = renderHook(({ open }) => useRandomPunishmentSelection(options, open), { initialProps: { open: true } });
    rerender({ open: false }); await advance(); expect(result.current.selectedPunishment).toBeNull(); expect(Math.random).not.toHaveBeenCalled();
    rerender({ open: true }); await advance(); expect(result.current.selectedPunishment?.punishment.id).toBe(uuid(75));
  });
});
