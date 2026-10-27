import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Tasks from '@/pages/Tasks';
import TaskCard from '@/components/TaskCard';
import { TaskActivity } from '@/components/task/TaskActivity';
import TaskFormProvider from '@/components/task-editor/TaskFormProvider';

const mocks = vi.hoisted(() => ({ actions: null as any, identity: null as any, data: null as any, legacy: vi.fn(), toggle: vi.fn(), resets: vi.fn() }));
vi.mock('@/lib/taskUtils', () => ({ getCurrentDayOfWeek: () => 0 }));
vi.mock('@/contexts/ActionCommandsContext', () => ({ useActionCommands: () => mocks.actions }));
vi.mock('@/contexts/UserIdsContext', () => ({ useUserIds: () => mocks.identity }));
vi.mock('@/contexts/auth', () => ({ useAuth: () => ({ user: { id: 'account' } }) }));
vi.mock('@/hooks/useTasksData', () => ({ useTasksData: () => mocks.legacy() }));
vi.mock('@/data/tasks/mutations/useToggleTaskCompletionMutation', () => ({ useToggleTaskCompletionMutation: () => mocks.toggle() }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children, onAddNewItem }: any) => <main>{children}<button onClick={onAddNewItem}>Add task</button></main> }));
vi.mock('@/components/task/TasksHeader', () => ({ default: () => <h1>Tasks</h1> }));
vi.mock('@/components/TaskEditor', () => ({ default: () => null }));
vi.mock('@/components/task/TaskIcon', () => ({ default: () => null }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, supabaseBackendId: 'local' }));
vi.mock('@/data/tasks/actionReadModel', async original => ({ ...await original<any>(), useTaskActionData: () => ({ data: mocks.data, error: null, isError: false }) }));
const task = { id: 'task', title: 'Morning task', description: '', frequency: 'daily', frequency_count: 2, points: 5, priority: 'medium', is_dom_task: false, completed: true, usage_data: [99,99,99,99,99,99,99] };
const progress = { taskId: 'task', beneficiaryParticipantId: 'sub-participant', currency: 'sub', frequency: 'daily', target: 2, currentCount: 0, usageData: [0,0,0,0,0,0,0], completed: false,
  localDate: '2026-10-25', weekStartDate: '2026-10-19', weekIdentifier: '2026-W43', timeZone: 'Pacific/Honolulu', lastCompletedDate: null, deleted: false };
const completion = { id: 'completion', task_id: 'task', kind: 'task_completed', provenance: 'command', recorded_at: '2026-10-25T13:00:00Z', subject: { title: 'Original task name', role: 'sub' }, actor_participant_id: 'sub-participant', beneficiary_participant_id: 'sub-participant', calendar: { localDate: '2026-10-25', timeZone: 'Pacific/Honolulu' } };
beforeEach(() => {
  mocks.actions = { scope: { accountId: 'account', participantId: 'sub-participant', relationshipId: 'period' }, mode: 'atomic', entries: [], confirmed: [], error: null, enqueue: vi.fn().mockResolvedValue(undefined), refresh: vi.fn(), retry: vi.fn(), cancelUnsent: vi.fn() };
  mocks.identity = { canAccessData: true, currentUserId: 'account', relationshipId: 'period', currentRole: 'sub', participantId: 'sub-participant', permissions: { task_complete: 'both', task_undo: 'both', definition_manage: 'both' }, subUserId: 'account', domUserId: 'other', isLoadingUserIds: false };
  mocks.data = { tasks: [{ ...task, deleted_at: null }], events: [], imported: [], points: [], progress: { task: { ...progress } }, progressErrors: {} };
  mocks.legacy.mockReset().mockReturnValue({ tasks: [], isLoading: false, error: null, checkAndReloadTasks: mocks.resets });
  mocks.toggle.mockReset().mockReturnValue({ mutateAsync: vi.fn() }); mocks.resets.mockReset();
});
afterEach(cleanup);
function mount() { return render(<QueryClientProvider client={new QueryClient()}><Tasks /></QueryClientProvider>); }
describe('mounted task page and server progress', () => {
  it('saves task identity only; ignores stale row completion/counters and mounts no legacy reset or mutation', async () => {
    mount();
    expect(screen.getByText('0/2')).toBeTruthy();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Complete' }));
    expect(mocks.actions.enqueue).toHaveBeenCalledWith({ kind: 'task_complete', taskId: 'task' });
    expect(screen.getByText('0/2')).toBeTruthy();
    expect(mocks.legacy).not.toHaveBeenCalled(); expect(mocks.toggle).not.toHaveBeenCalled(); expect(mocks.resets).not.toHaveBeenCalled();
  });
  it('retains the legacy branch only for a verified disabled period', () => {
    mocks.actions.mode = 'legacy'; mount();
    expect(mocks.legacy).toHaveBeenCalled(); expect(mocks.toggle).toHaveBeenCalled(); expect(mocks.resets).toHaveBeenCalled();
  });
  it('never mounts legacy on an unavailable gate or command failure', async () => {
    mocks.actions.enqueue.mockRejectedValue(new Error('Storage unavailable; no action sent.')); mount();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Complete' }));
    expect((await screen.findByRole('alert')).textContent).toContain('no action sent');
    expect(mocks.legacy).not.toHaveBeenCalled(); cleanup();
    mocks.actions.mode = 'error'; mocks.actions.error = 'Status unavailable'; mount();
    expect(screen.getByRole('alert').textContent).toContain('Status unavailable'); expect(mocks.legacy).not.toHaveBeenCalled();
  });
  it('uses weekly total and the cap, not today’s array cell', () => {
    mocks.data.tasks[0].frequency = 'weekly'; mocks.data.progress.task = { ...progress, frequency: 'weekly', usageData: [1,1,0,0,0,0,0], currentCount: 2, completed: true };
    mount(); expect(screen.getByText('2/2')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Completed' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Monday–Sunday · Pacific/Honolulu')).toBeTruthy();
  });
  it('marks the server’s Sunday even when the browser clock is on another date', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-26T12:00:00Z'));
    mount(); expect(screen.getByLabelText('Sunday: 0 completions, today')).toBeTruthy();
    expect(screen.queryByLabelText('Monday: 0 completions, today')).toBeNull();
  });
  it('keeps invalid task definitions editable without fabricating zero progress', () => {
    mocks.data.progress = {}; mocks.data.progressErrors.task = 'The person assigned this task needs a saved timezone in Profile.';
    mount(); expect(screen.getByLabelText('Task progress unavailable')).toBeTruthy(); expect(screen.queryByText('0/2')).toBeNull();
    expect(screen.getByRole('button', { name: 'Edit Morning task' })).toBeTruthy(); expect((screen.getByRole('button', { name: 'Complete' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('gates role permissions and pending uncertainty without losing the saved retry', () => {
    mocks.identity.permissions.task_complete = 'dom'; mocks.identity.permissions.definition_manage = 'dom';
    mocks.actions.entries = [{ command: { commandId: 'pending', kind: 'task_complete' }, state: { status: 'confirmation_unknown' }, canReplay: true, canCancel: false, problem: { message: 'Retry the same action.' } }];
    mount(); expect((screen.getByRole('button', { name: 'Complete' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Edit Morning task' })).toBeNull(); expect(screen.getByRole('button', { name: 'Retry same action' })).toBeTruthy();
  });
});
describe('task corrections and preserved history', () => {
  it('lets Dom undo a Sub completion after deletion and definition repricing, using only the original event ID', async () => {
    mocks.identity.currentRole = 'dom'; mocks.identity.participantId = 'dom-participant'; mocks.data.tasks[0].deleted_at = '2026-10-26T00:00:00Z'; mocks.data.tasks[0].points = 99;
    mocks.data.events = [completion]; mocks.data.points = [{ id: 'point', event_id: 'completion', currency: 'sub', amount: 5 }];
    render(<TaskActivity data={mocks.data} />); await userEvent.setup().click(screen.getByText('Task History'));
    expect(screen.getByText('Sub balance: +5 points')).toBeTruthy(); expect(screen.getByText(/Task removed from current cards/)).toBeTruthy();
    expect(screen.getByText('Recorded by: Your partner')).toBeTruthy();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Undo completion' }));
    expect(mocks.actions.enqueue).toHaveBeenCalledWith({ kind: 'undo', eventId: 'completion' });
    expect(screen.getByText('Completed: Original task name')).toBeTruthy();
  });
  it('preserves the original and reversal and disables repeat Undo', async () => {
    mocks.data.events = [completion, { ...completion, id: 'undo', kind: 'action_undone', reverses_event_id: 'completion' }];
    render(<TaskActivity data={mocks.data} />); await userEvent.setup().click(screen.getByText('Task History'));
    expect(screen.getByText('Already undone; both records stay in History.')).toBeTruthy(); expect((screen.getByRole('button', { name: 'Undo completion' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Undone: Original task name')).toBeTruthy();
  });
  it('distinguishes the Sub completion from the Dom correction and leaves an unknown actor neutral', async () => {
    mocks.identity.currentRole = 'dom'; mocks.identity.participantId = 'dom-participant';
    mocks.data.events = [completion,
      { ...completion, id: 'undo', kind: 'action_undone', reverses_event_id: 'completion', actor_participant_id: 'dom-participant' },
      { ...completion, id: 'unknown', subject: { title: 'Unknown actor', role: 'sub' }, actor_participant_id: null }];
    render(<TaskActivity data={mocks.data} />); await userEvent.setup().click(screen.getByText('Task History'));
    expect(within(screen.getByText('Completed: Original task name').closest('article')!).getByText('Recorded by: Your partner')).toBeTruthy();
    expect(within(screen.getByText('Undone: Original task name').closest('article')!).getByText('Recorded by: You')).toBeTruthy();
    expect(within(screen.getByText('Completed: Unknown actor').closest('article')!).getByText('Recorded by: Not recorded')).toBeTruthy();
  });
  it('renders original imported timestamps without fabricated points, owner, or Undo', async () => {
    mocks.data.imported = [{ id: 'old', task_id: 'task', completed_at: '2025-04-01T07:13:00+00:00' }];
    render(<TaskActivity data={mocks.data} />); await userEvent.setup().click(screen.getByText('Task History'));
    expect(screen.getByText('2025-04-01T07:13:00+00:00')).toBeTruthy(); expect(screen.getByText(/actor, affected role, timezone/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Undo completion' })).toBeNull();
  });
  it('preserves valid zero-valued task editor fields', () => {
    render(<TaskFormProvider formBaseId="test" taskData={{ points: 0, background_opacity: 0, focal_point_x: 0, focal_point_y: 0 }}>{form => <output>{JSON.stringify(form.getValues())}</output>}</TaskFormProvider>);
    const values = JSON.parse(screen.getByRole('status').textContent!);
    expect(values).toMatchObject({ points: 0, background_opacity: 0, focal_point_x: 0, focal_point_y: 0 });
  });
});
