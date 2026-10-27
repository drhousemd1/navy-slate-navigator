import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AtomicTasksContent } from '@/components/task/AtomicTasksContent';
import { useRecordingData } from '@/data/recordings/useRecordingData';
const mocks = vi.hoisted(() => ({ actions: null as any, identity: null as any, refresh: vi.fn(), saveTask: vi.fn(), removeTask: vi.fn(), saveRecording: vi.fn(), removeRecording: vi.fn(), outcomes: [] as string[] }));
vi.mock('@/contexts/ActionCommandsContext', () => ({ useActionCommands: () => mocks.actions }));
vi.mock('@/contexts/UserIdsContext', () => ({ useUserIds: () => mocks.identity }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: {}, error: null }), useQueryClient: () => ({ invalidateQueries: mocks.refresh }) }));
vi.mock('@/data/tasks/actionReadModel', () => ({ taskActionKey: (s: any) => [s.relationshipSessionId], taskPermission: () => true,
  useTaskActionData: () => ({ data: { tasks: [], events: [], points: [] }, error: null }), saveTaskDefinition: (...args: any[]) => mocks.saveTask(...args), removeTaskDefinition: (...args: any[]) => mocks.removeTask(...args) }));
vi.mock('@/data/recordings/readModel', () => ({ recordingKey: (s: any) => [s?.relationshipSessionId], readRecordingData: vi.fn(),
  saveRecordingDefinition: (...args: any[]) => mocks.saveRecording(...args), removeRecordingDefinition: (...args: any[]) => mocks.removeRecording(...args) }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children, onAddNewItem }: any) => <main><button onClick={onAddNewItem}>New task</button>{children}</main> }));
vi.mock('@/components/task/TasksHeader', () => ({ default: () => null }));
vi.mock('@/components/task/TasksList', () => ({ default: () => null }));
vi.mock('@/components/task/TaskActivity', () => ({ TaskActivity: () => null }));
vi.mock('@/components/TaskEditor', () => ({ default: ({ isOpen, onSave }: any) => isOpen ? <div aria-label="Task editor"><button onClick={() => void onSave({ title: 'Task' }).then(() => mocks.outcomes.push('success'), (error: Error) => mocks.outcomes.push(error.message))}>Save task</button></div> : null }));
const scope = { backendId: 'https://fixture.invalid', accountId: 'A', participantId: 'P', relationshipId: 'period', relationshipSessionId: 'session-1' };
const next = { ...scope, relationshipSessionId: 'session-2' };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
beforeEach(() => {
  mocks.actions = { scope, mode: 'atomic', entries: [], confirmed: [], data: {}, error: null };
  mocks.identity = { currentRole: 'sub', permissions: { definition_manage: 'both' } }; mocks.outcomes = [];
  mocks.refresh.mockReset(); mocks.saveTask.mockReset().mockResolvedValue(undefined); mocks.removeTask.mockReset().mockResolvedValue(undefined);
  mocks.saveRecording.mockReset().mockResolvedValue({ id: 'r' }); mocks.removeRecording.mockReset().mockResolvedValue(undefined);
});
afterEach(cleanup);
describe('definition final-refresh races', () => {
  it('does not close a new task editor when an older session save finishes its refresh', async () => {
    const pending = deferred<void>(); mocks.refresh.mockReturnValue(pending.promise);
    const view = render(<AtomicTasksContent />);
    fireEvent.click(screen.getByText('New task')); fireEvent.click(screen.getByText('Save task'));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    mocks.actions = { ...mocks.actions, scope: next }; view.rerender(<AtomicTasksContent />);
    expect(screen.queryByLabelText('Task editor')).toBeNull();
    fireEvent.click(screen.getByText('New task'));
    await act(async () => pending.resolve());
    expect(screen.getByLabelText('Task editor')).toBeTruthy();
    expect(mocks.outcomes).toHaveLength(1); expect(mocks.outcomes[0]).toContain('relationship changed');
  });
  it.each(['save', 'remove'] as const)('does not resolve recording %s as successful after scope changes during final refresh', async method => {
    const pending = deferred<void>(); mocks.refresh.mockReturnValue(pending.promise);
    const { result, rerender } = renderHook(() => useRecordingData('rule'));
    const operation = method === 'save' ? result.current.save({ title: 'Rule' }) : result.current.remove('r');
    const outcome = expect(operation).rejects.toThrow('relationship changed');
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    mocks.actions = { ...mocks.actions, scope: next }; rerender();
    await act(async () => { pending.resolve(); await outcome; });
  });
});
