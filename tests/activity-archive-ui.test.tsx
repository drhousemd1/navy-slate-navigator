import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { useUserIds } from '@/contexts/UserIdsContext';
import type { useActionCommands } from '@/contexts/ActionCommandsContext';
import type { RetainedActivityPage, RetainedActivityPeriod, RetainedActivityRow } from '@/data/activityArchive/types';
import type { TaskActionData } from '@/data/tasks/actionReadModel';
import { ActivityHistory } from '@/components/activity/ActivityHistory';
import { RetainedActivityRows } from '@/components/activity/RetainedActivityRows';
import { TaskActivity } from '@/components/task/TaskActivity';
import { RewardActivity } from '@/components/rewards/RewardActivity';
import { RecordingActivity } from '@/components/recordings/RecordingActivity';
import { ActivityArchiveError } from '@/data/activityArchive/transport';
import { archiveId, archivePage, archiveRow, archiveScope, deferredArchive, retainedPeriod } from './activity-archive.helpers';

const mocks = vi.hoisted(() => ({ identity: {} as ReturnType<typeof useUserIds>, actions: {} as ReturnType<typeof useActionCommands>, periods: vi.fn(), history: vi.fn(), initialize: vi.fn() }));
vi.mock('@/contexts/UserIdsContext', () => ({ useUserIds: () => mocks.identity }));
vi.mock('@/contexts/ActionCommandsContext', () => ({ useActionCommands: () => mocks.actions }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, supabaseBackendId: 'https://archive.invalid' }));
vi.mock('@/data/activityArchive/transport', async importOriginal => ({ ...await importOriginal<typeof import('@/data/activityArchive/transport')>(), activityArchiveTransport: { periods: mocks.periods, history: mocks.history } }));
const emptyTasks = (): TaskActionData => ({ tasks: [], events: [], points: [], imported: [], progress: {}, progressErrors: {} });
const emptyRecordings = () => ({ definitions: [], events: [], points: [], imported: [], progress: [] });
beforeEach(() => {
  mocks.initialize.mockReset().mockResolvedValue(undefined);
  mocks.identity = { canAccessData: true, isLoadingUserIds: false, currentUserId: archiveScope.accountId,
    relationshipId: archiveScope.relationshipId, relationshipSessionId: archiveScope.relationshipSessionId,
    currentRole: 'sub', participantId: archiveId(6), permissions: { task_undo: 'both' }, initializeUserIds: mocks.initialize } as ReturnType<typeof useUserIds>;
  mocks.actions = { mode: 'atomic', entries: [], confirmed: [], error: null, scope: { ...archiveScope, participantId: archiveId(6) }, enqueue: vi.fn().mockResolvedValue(undefined),
    data: { events: [], rewards: [], points: [], wallets: [], lots: [], deliveries: [], acknowledged: [], importedUsage: [] } } as unknown as ReturnType<typeof useActionCommands>;
  mocks.periods.mockReset().mockResolvedValue([retainedPeriod]);
  mocks.history.mockReset().mockResolvedValue(archivePage([archiveRow()]));
});
afterEach(cleanup);
const history = () => <ActivityHistory domain="task" title="Task History"><p>Current actions</p><button>Undo current action</button></ActivityHistory>;
async function open(title = 'Task History') { await userEvent.setup().click(screen.getByText(title)); await screen.findByLabelText('History period'); }
async function earlier() { await screen.findByRole('option', { name: /Former partner/ }); await userEvent.setup().selectOptions(screen.getByLabelText('History period'), retainedPeriod.periodId); }

describe('earlier periods inside the existing History panels', () => {
  it.each(['task', 'reward', 'rule', 'punishment'] as const)('keeps %s archives reachable with empty current definitions after Fresh', async domain => {
    const titles = { task: 'Task History', reward: 'Reward History', rule: 'Rule History', punishment: 'Punishment History' };
    mocks.history.mockResolvedValue(archivePage([archiveRow()], null, domain));
    render(domain === 'task' ? <TaskActivity data={emptyTasks()} /> : domain === 'reward' ? <RewardActivity /> : <RecordingActivity type={domain} data={emptyRecordings()} refresh={vi.fn()} />);
    expect(mocks.periods).not.toHaveBeenCalled();
    await open(titles[domain]); await earlier();
    const archive = within(await screen.findByRole('region', { name: 'Earlier activity history' }));
    expect(await archive.findByText('Recorded title: Recorded task title')).toBeTruthy();
    expect(archive.queryByRole('button', { name: /Undo/ })).toBeNull();
    expect(mocks.history).toHaveBeenCalledWith(archiveScope, retainedPeriod.periodId, domain, null, expect.any(AbortSignal));
    expect(mocks.actions.enqueue).not.toHaveBeenCalled();
  });
  it('returns to the existing working Undo path after viewing read-only earlier records', async () => {
    const current = emptyTasks(); current.events.push({ id: archiveId(11), task_id: archiveId(12), relationship_id: archiveScope.relationshipId,
      kind: 'task_completed', actor_participant_id: archiveId(6), beneficiary_participant_id: archiveId(6),
      subject: { title: 'Current task', role: 'sub' }, recorded_at: '2026-11-06T12:00:00Z', calendar: null, reverses_event_id: null, provenance: 'command' });
    render(<TaskActivity data={current} />); await open();
    expect(screen.getByRole('button', { name: 'Undo completion' })).toBeTruthy();
    await earlier(); await screen.findByText('Recorded title: Recorded task title');
    expect(screen.queryByRole('button', { name: 'Undo completion' })).toBeNull();
    expect(screen.getByText(/titles and other text may still contain identifying details/)).toBeTruthy();
    await userEvent.setup().selectOptions(screen.getByLabelText('History period'), 'current');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Undo completion' }));
    expect(mocks.actions.enqueue).toHaveBeenCalledWith({ kind: 'undo', eventId: archiveId(11) });
    expect(screen.queryByRole('region', { name: 'Earlier activity history' })).toBeNull();
  });
  it('shows loading and empty states, and retries an ordinary period-list error without refreshing identity', async () => {
    const choices = deferredArchive<RetainedActivityPeriod[]>(); const page = deferredArchive<RetainedActivityPage>();
    mocks.periods.mockReturnValueOnce(choices.promise).mockResolvedValue([retainedPeriod]); mocks.history.mockReturnValue(page.promise);
    render(history()); await open(); expect(screen.getByText('Loading earlier period choices…')).toBeTruthy();
    await act(async () => choices.reject(new Error('offline')));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry period choices' })); await earlier();
    expect(screen.getByText('Loading earlier history…')).toBeTruthy();
    await act(async () => page.resolve(archivePage([])));
    expect(screen.getByText('No task activity was recorded in this earlier period.')).toBeTruthy();
    expect(mocks.initialize).not.toHaveBeenCalled();
  });
  it('keeps the loaded page during a failed load-more and retries the same cursor', async () => {
    mocks.history.mockResolvedValueOnce(archivePage([archiveRow(1)], 'page-2')).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(archivePage([archiveRow(2, { title: { basis: 'recorded_snapshot', text: 'Second record' } })]));
    render(history()); await open(); await earlier();
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Load more history' }));
    expect(screen.getByText('Recorded title: Recorded task title')).toBeTruthy();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry earlier history' }));
    await screen.findByText('Recorded title: Second record');
    expect(screen.getAllByRole('article')).toHaveLength(2); expect(screen.queryByRole('button', { name: 'Load more history' })).toBeNull();
    expect(mocks.history.mock.calls.slice(1).map(args => args[3])).toEqual(['page-2', 'page-2']);
  });
  it.each(['period choices', 'history page'])('refreshes canonical identity after stale %s instead of retrying a stale session', async stage => {
    const newSession = archiveId(40);
    mocks.periods.mockImplementation(async scope => {
      if (scope.relationshipSessionId === newSession) return [];
      if (stage === 'period choices') throw new ActivityArchiveError('STALE_RELATIONSHIP_SESSION');
      return [retainedPeriod];
    });
    mocks.history.mockResolvedValueOnce(archivePage([archiveRow()], 'page-2')).mockRejectedValueOnce(new ActivityArchiveError('STALE_RELATIONSHIP_SESSION'));
    const view = render(history());
    mocks.initialize.mockImplementation(async () => { mocks.identity = { ...mocks.identity, relationshipSessionId: newSession }; view.rerender(history()); });
    await open();
    if (stage === 'history page') {
      await earlier(); await userEvent.setup().click(await screen.findByRole('button', { name: 'Load more history' }));
      expect(screen.queryByText('Recorded title: Recorded task title')).toBeNull();
    }
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Refresh connection and period choices' }));
    await screen.findByText('No earlier periods are available for this account.');
    expect(mocks.initialize).toHaveBeenCalledTimes(1);
    expect(mocks.periods.mock.calls.map(args => args[0].relationshipSessionId)).toEqual([archiveScope.relationshipSessionId, newSession]);
    expect((screen.getByLabelText('History period') as HTMLSelectElement).value).toBe('current');
    expect(screen.queryByRole('region', { name: 'Earlier activity history' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Refresh connection and period choices' })).toBeNull();
  });
  it('does not start a late list read after identity recovery unmounts the History panel', async () => {
    const repair = deferredArchive<void>(); mocks.initialize.mockReturnValue(repair.promise);
    mocks.periods.mockRejectedValue(new ActivityArchiveError('STALE_RELATIONSHIP'));
    const view = render(history()); await open();
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Refresh connection and period choices' }));
    view.unmount(); await act(async () => repair.resolve());
    expect(mocks.periods).toHaveBeenCalledTimes(1);
  });
  it('does not show a late recovery error or reload the newly switched account', async () => {
    const repair = deferredArchive<void>(); mocks.initialize.mockReturnValue(repair.promise);
    mocks.periods.mockRejectedValueOnce(new ActivityArchiveError('STALE_RELATIONSHIP')).mockResolvedValue([]);
    const view = render(history()); await open();
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Refresh connection and period choices' }));
    mocks.identity = { ...mocks.identity, currentUserId: archiveId(99) }; view.rerender(history());
    await screen.findByText('No earlier periods are available for this account.');
    await act(async () => repair.reject(new Error('old identity failure')));
    expect(screen.queryByText(/could not be refreshed/)).toBeNull(); expect(mocks.periods).toHaveBeenCalledTimes(2);
  });
});

describe('read-only retained record meaning', () => {
  it('retains shared partner-only events and both-person currency changes including zero without substituting missing point calendars', () => {
    render(<RetainedActivityRows domain="punishment" rows={[archiveRow(1, { kind: 'punishment_applied', actor: 'former_partner', beneficiary: 'former_partner', pointEffects: [
      { person: 'former_partner', currency: 'dom', amount: 4, calendar: null },
      { person: 'you', currency: 'sub', amount: -10, calendar: { localDate: '2026-10-25', weekStartDate: '2026-10-19', timeZone: 'America/Los_Angeles' } },
      { person: 'deleted_account', currency: 'sub', amount: 0, calendar: null },
    ] })]} />);
    expect(screen.getByText('Recorded by: Former partner · Affected person: Former partner')).toBeTruthy();
    expect(screen.getByText('Former partner · Dom points: +4')).toBeTruthy(); expect(screen.getByText('You · Sub points: -10')).toBeTruthy();
    expect(screen.getByText('Deleted account · Sub points: 0')).toBeTruthy();
    expect(screen.getAllByText('Points recorded for: Date and timezone not recorded')).toHaveLength(2);
    expect(screen.getByText('Points recorded for: 2026-10-25 · Week starting 2026-10-19 · America/Los_Angeles')).toBeTruthy();
    expect(screen.getByText('Oct 26, 2026, 12:00:00 PM UTC').getAttribute('dateTime')).toBe('2026-10-26T12:00:00Z');
    expect(screen.getByText('Source: Recorded in the app')).toBeTruthy(); expect(screen.queryByRole('button')).toBeNull();
  });
  it('distinguishes imported true, false and unknown Use status, with unknown points, roles and original names', () => {
    const rows = [true, false, null].map((used, n): RetainedActivityRow => archiveRow(n, { key: `imported:${archiveId(n + 20)}`, source: 'imported', kind: 'reward_use_record',
      timestamp: null, title: { text: 'Renamed reward', basis: 'current_reference' }, actor: 'not_recorded', beneficiary: 'not_recorded', role: null, calendar: null,
      pointEffects: null, provenance: 'legacy_record', legacy: { used, dayOfWeek: 0, weekNumber: null } }));
    render(<RetainedActivityRows domain="reward" rows={rows} />);
    expect(screen.getAllByRole('heading', { name: 'Imported reward-use record' })).toHaveLength(3);
    for (const label of ['Used', 'Not marked used', 'Not recorded']) expect(screen.getByText(`Saved status: ${label}`)).toBeTruthy();
    expect(screen.getAllByText('Title: Renamed reward (current name; original name not saved)')).toHaveLength(3);
    expect(screen.getAllByText('Saved timestamp: Not recorded')).toHaveLength(3); expect(screen.getAllByText('Recorded role: Not recorded')).toHaveLength(3);
    expect(screen.getAllByText('Points: Not recorded; no balance change can be inferred from this imported record.')).toHaveLength(3);
    expect(screen.getAllByText(/day-of-week 0 · week not recorded/)).toHaveLength(3);
    expect(screen.queryByRole('heading', { name: 'Used reward' })).toBeNull(); expect(screen.queryByRole('button')).toBeNull();
  });
  it('keeps zero deductions, recorded no-effect events, opening inventory and correction provenance distinct', () => {
    const original = archiveRow(1, { kind: 'opening_inventory', provenance: 'legacy_import', title: { text: null, basis: 'unavailable' } });
    render(<><RetainedActivityRows domain="reward" rows={[original, archiveRow(2, { kind: 'action_undone', reversesKey: original.key })]} />
      <RetainedActivityRows domain="punishment" rows={[archiveRow(3, { key: `imported:${archiveId(23)}`, source: 'imported', kind: 'punishment_applied',
        actor: 'not_recorded', beneficiary: 'not_recorded', role: null, calendar: null, pointEffects: null, provenance: 'legacy_record',
        title: { text: 'Current punishment', basis: 'current_reference' }, legacy: { pointsDeducted: 0 } })]} /></>);
    expect(screen.getByText('Imported starting inventory; this does not establish an original purchase or its price.')).toBeTruthy();
    expect(screen.getAllByText('Points: No recorded balance change.')).toHaveLength(2);
    expect(screen.getByText('Saved deduction: 0 points (legacy value; actual balance change unverified).')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View original record' }).getAttribute('href')).toBe(`#retained-${original.key}`);
    expect(screen.getByText('Title: Not recorded or no longer available')).toBeTruthy(); expect(screen.queryByRole('button')).toBeNull();
  });
});
