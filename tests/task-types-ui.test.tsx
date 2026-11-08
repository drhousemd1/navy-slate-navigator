import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { TaskScheduleFields } from '@/components/task-editor/TaskScheduleFields';
import TaskFormActions from '@/components/task-editor/TaskFormActions';
import TaskCard from '@/components/TaskCard';
import { TaskActivity } from '@/components/task/TaskActivity';
import TaskFormProvider, { type LocalTaskFormValues } from '@/components/task-editor/TaskFormProvider';
import type { TaskProgress } from '@/domain/actions/types';
vi.mock('@/hooks/useEditorDraftScope', () => ({ useEditorDraftScope: () => ({ backendId: 'local', accountId: 'synthetic', relationshipId: 'period', relationshipSessionId: 'generation' }) }));
const theme = vi.hoisted(() => ({ currentScheme: 'default' }));
vi.mock('@/contexts/ColorSchemeContext', () => ({ useColorScheme: () => theme }));
vi.mock('@/lib/taskUtils', () => ({ getCurrentDayOfWeek: () => 0 }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, supabaseBackendId: 'local' }));
vi.mock('@/components/task/TaskIcon', () => ({ default: () => null }));
vi.mock('@/contexts/ActionCommandsContext', () => ({ useActionCommands: () => ({ entries: [], scope: null, enqueue: vi.fn() }) }));
vi.mock('@/contexts/UserIdsContext', () => ({ useUserIds: () => ({ currentRole: 'sub', permissions: { task_undo: 'both' }, participantId: 'sub' }) }));
vi.mock('@/components/activity/SavedActions', () => ({ SavedActions: () => null }));
vi.mock('@/components/activity/ActivityHistory', () => ({ ActivityHistory: ({ children }: any) => <section>{children}</section> }));
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.scrollIntoView ??= () => {};
beforeEach(() => { vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); });
afterEach(() => { cleanup(); localStorage.clear(); theme.currentScheme = 'default'; vi.unstubAllGlobals(); });
function Editor({ initial = {}, atomic = true, onSubmit }: { initial?: Partial<LocalTaskFormValues>; atomic?: boolean; onSubmit?: () => void }) {
  const form = useForm<LocalTaskFormValues>({ defaultValues: { frequency: 'daily', frequency_count: 3, mandatory: false, deadline_date: null, deadline_time: null, deadline_weekday: null, ...initial } });
  return <Form {...form}><form onSubmit={event => { event.preventDefault(); onSubmit?.(); }}><TaskScheduleFields form={form} atomic={atomic} disabled={false} /><output data-testid="values">{JSON.stringify(form.watch())}</output>{onSubmit && <button type="submit">Save</button>}</form></Form>;
}
const values = () => JSON.parse(screen.getByTestId('values').textContent!);
const progress: TaskProgress = { taskId: 'task', beneficiaryParticipantId: 'sub', currency: 'sub', timeZone: 'Pacific/Honolulu', localDate: '2026-11-02', weekStartDate: '2026-11-02', weekIdentifier: '2026-W45',
  frequency: 'once', target: 1, currentCount: 0, usageData: [0,0,0,0,0,0,0], completed: false, lastCompletedDate: null, deleted: false, mandatory: true,
  deadline: { date: '2026-11-01', time: '09:00', weekday: null }, dueAt: '2026-11-01T19:00:00Z', overdue: true, lastCompletionLate: null };
describe('task type interactions', () => {
  it('Enter in date/time controls does not save; the explicit Save action still does', async () => {
    const submit = vi.fn(), user = userEvent.setup();
    render(<Editor initial={{ frequency: 'once', frequency_count: 1, deadline_date: '2026-11-07', deadline_time: '08:30' }} onSubmit={submit} />);
    for (const label of ['Due date', 'Due time']) {
      screen.getByLabelText(label).focus();
      await user.keyboard('{Enter}');
    }
    expect(submit).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Save', exact: true }));
    expect(submit).toHaveBeenCalledTimes(1);
  });
  it('implicit form submission never activates the Delete Task control', async () => {
    const submit = vi.fn(), openDelete = vi.fn(), user = userEvent.setup();
    render(<form onSubmit={event => { event.preventDefault(); submit(); }}>
      <input aria-label="Task title" defaultValue="Task" />
      <TaskFormActions taskData={{ id: 'task' }} isDeleteDialogOpen={false} setIsDeleteDialogOpen={openDelete}
        onCancel={vi.fn()} onDelete={vi.fn()} />
    </form>);
    screen.getByLabelText('Task title').focus();
    await user.keyboard('{Enter}');
    expect(submit).toHaveBeenCalledTimes(1);
    expect(openDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Delete Task', exact: true }));
    expect(openDelete).toHaveBeenCalledWith(true);
    expect(submit).toHaveBeenCalledTimes(1);
  });
  it('switching frequency clears only the incompatible deadline and sets the one-time target', async () => {
    render(<Editor initial={{ deadline_time: '17:00' }} />);
    await userEvent.setup().click(screen.getByRole('combobox', { name: 'Frequency' }));
    await userEvent.setup().click(screen.getByRole('option', { name: 'One-time' }));
    expect(values()).toMatchObject({ frequency: 'once', frequency_count: 1, deadline_time: null, mandatory: false });
    expect(screen.queryByText(/stays completed until undone/)).toBeNull();
    expect(screen.queryByText('Times per period')).toBeNull();
    await userEvent.setup().click(screen.getByLabelText('Set a deadline'));
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2026-11-07' } });
    fireEvent.change(screen.getByLabelText('Due time'), { target: { value: '08:30' } });
    await userEvent.setup().click(screen.getByLabelText('Mandatory task'));
    expect(values()).toMatchObject({ deadline_date: '2026-11-07', deadline_time: '08:30', deadline_weekday: null, mandatory: true });
  });
  it('retains a loaded weekly deadline without resetting values or adding timezone instructions', () => {
    render(<Editor initial={{ frequency: 'weekly', deadline_time: '08:00', deadline_weekday: 2, mandatory: true, is_dom_task: true }} />);
    expect((screen.getByLabelText('Due weekday') as HTMLSelectElement).value).toBe('2');
    expect((screen.getByLabelText('Due time') as HTMLInputElement).value).toBe('08:00');
    expect(screen.queryByText(/Uses the Dom’s saved timezone/)).toBeNull();
    expect(values().mandatory).toBe(true);
  });
  it('uses the original field text classes for schedule controls in the light palette', () => {
    theme.currentScheme = 'light-turquoise';
    render(<Editor initial={{ frequency: 'weekly', deadline_time: '08:00', deadline_weekday: 2 }} />);
    expect(screen.getByRole('group', { name: 'Task schedule' }).className).not.toContain('text-white');
    expect(screen.getByRole('combobox', { name: 'Frequency' }).className).toContain('text-white');
    expect(screen.getByLabelText('Due weekday').className).toContain('text-white');
    expect(screen.getByLabelText('Due time').className).toContain('text-white');
  });
  it('restores one-time deadline and mandatory edits through the real scoped draft provider', async () => {
    const taskData = { id: 'draft-task', frequency: 'once', frequency_count: 1, mandatory: true, deadline_date: '2026-11-07', deadline_time: '09:00:00' };
    const editor = () => <TaskFormProvider formBaseId="task-types-draft" taskData={taskData}>{form => <>
      <TaskScheduleFields form={form} atomic disabled={false} /><output data-testid="values">{JSON.stringify(form.watch())}</output>
    </>}</TaskFormProvider>;
    const first = render(editor());
    await userEvent.setup().click(screen.getByLabelText('Mandatory task'));
    fireEvent.change(screen.getByLabelText('Due time'), { target: { value: '08:30' } });
    first.unmount();
    render(editor());
    expect(values()).toMatchObject({ frequency: 'once', frequency_count: 1, mandatory: false, deadline_date: '2026-11-07', deadline_time: '08:30' });
    expect((screen.getByLabelText('Due time') as HTMLInputElement).value).toBe('08:30');
  });
  it('legacy mode exposes no one-time, mandatory or deadline controls', () => {
    render(<Editor atomic={false} />);
    expect(screen.queryByRole('option', { name: 'One-time' })).toBeNull();
    expect(screen.queryByLabelText('Mandatory task')).toBeNull();
    expect(screen.queryByLabelText('Set a deadline')).toBeNull();
  });
  it('late mandatory tasks remain completable for normal points, in the beneficiary timezone', async () => {
    const complete = vi.fn();
    render(<TaskCard atomic title="Task" description="" points={5} frequency="once" progress={progress} onToggleCompletion={complete} />);
    expect(screen.getByText('Mandatory')).toBeTruthy();
    expect(screen.getByText('Overdue')).toBeTruthy();
    expect(screen.getByText('Due Nov 1, 2026, 9:00 AM').getAttribute('title')).toBe('Pacific/Honolulu');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Complete' }));
    expect(complete).toHaveBeenCalledTimes(1);
  });
  it('one-time completion stays visibly finished when the week marks are empty', () => {
    render(<TaskCard atomic title="Task" description="" points={5} frequency="once" progress={{ ...progress, currentCount: 1, completed: true, overdue: false, lastCompletionLate: true }} onToggleCompletion={vi.fn()} />);
    expect((screen.getByRole('button', { name: 'Completed' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText(/One-time · Completed/)).toBeNull();
    expect(screen.queryByText(/Last completion was late/)).toBeNull();
  });
  it('history shows recorded due/late/mandatory facts after definition edits, without assigning them to older events', () => {
    const event = { id: 'event', task_id: 'task', kind: 'task_completed', provenance: 'command', recorded_at: '2026-11-02T12:00:00Z', subject: { title: 'Original task', role: 'sub' }, actor_participant_id: 'sub', calendar: { localDate: '2026-11-02', timeZone: 'Pacific/Honolulu' },
      definition_values: { frequency: 'once', mandatory: true, dueAt: progress.dueAt, late: true } };
    render(<TaskActivity data={{ tasks: [{ id: 'task', mandatory: false }], events: [event, { ...event, id: 'old', subject: { title: 'Older task', role: 'sub' }, definition_values: { frequency: 'daily' } }], points: [], imported: [], progress: {}, progressErrors: {} } as any} />);
    expect(screen.getAllByText(/Mandatory when completed/)).toHaveLength(1);
    expect(screen.getAllByText(/Completed late; normal points applied/)).toHaveLength(1);
    expect(screen.getByText('Completed: Older task')).toBeTruthy();
  });
});
