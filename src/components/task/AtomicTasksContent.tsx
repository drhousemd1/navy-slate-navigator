import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/AppLayout';
import TaskEditor from '@/components/TaskEditor';
import TasksHeader from './TasksHeader';
import TasksList from './TasksList';
import { TaskActivity } from './TaskActivity';
import { useActionCommands } from '@/contexts/ActionCommandsContext';
import { useUserIds } from '@/contexts/UserIdsContext';
import { removeTaskDefinition, saveTaskDefinition, taskActionKey, taskPermission, useTaskActionData } from '@/data/tasks/actionReadModel';
import type { TaskFormValues, TaskWithId } from '@/data/tasks/types';
import { scopeKey } from '@/data/actions/contracts';

export function AtomicTasksContent() {
  const actions = useActionCommands();
  const identity = useUserIds();
  const key = actions.scope ? scopeKey(actions.scope) : null;
  const currentKey = useRef(key); currentKey.current = key;
  useEffect(() => { currentKey.current = key; return () => { currentKey.current = null; }; }, [key]);
  const queryClient = useQueryClient();
  const query = useTaskActionData(actions.scope, actions.mode === 'atomic');
  const [editing, setEditing] = useState<TaskWithId | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setEditing(null); setEditorOpen(false); setError(null); setSaving(false); }, [key]);
  const pending = actions.entries.some(entry => entry.canReplay && ['pending', 'sending', 'confirmation_unknown'].includes(entry.state.status));
  const canManage = taskPermission(identity.permissions ?? {}, identity.currentRole, 'definition_manage');
  const canComplete = taskPermission(identity.permissions ?? {}, identity.currentRole, 'task_complete');
  const refresh = () => queryClient.invalidateQueries({ queryKey: taskActionKey(actions.scope), exact: true });
  const close = () => { setEditorOpen(false); setEditing(null); };
  const mutateDefinition = async (operation: () => Promise<void>) => {
    if (!actions.scope || !canManage || pending) throw new Error('Resolve pending actions and check your task editing permission before saving.');
    const assertCurrent = () => { if (currentKey.current !== key) throw new Error('Your relationship changed. Reopen the current task before continuing.'); };
    assertCurrent(); await operation(); assertCurrent(); await refresh(); assertCurrent(); close();
  };
  const save = (values: TaskFormValues) => mutateDefinition(() => saveTaskDefinition(actions.scope!, values, editing?.id));
  const remove = (id: string) => mutateDefinition(() => removeTaskDefinition(actions.scope!, id));
  const complete = async (taskId: string) => {
    if (!canComplete || pending || saving) return;
    setError(null); setSaving(true);
    try { await actions.enqueue({ kind: 'task_complete', taskId }); }
    catch (e) { if (currentKey.current === key) setError(e instanceof Error ? e.message : 'Task completion could not be saved.'); }
    finally { if (currentKey.current === key) setSaving(false); }
  };
  return <AppLayout onAddNewItem={() => {
    if (!canManage) { setError('Your relationship permission does not allow task editing.'); return; }
    if (pending) { setError('Resolve the pending action before editing tasks.'); return; }
    setEditing(null); setEditorOpen(true);
  }}>
    <div className="p-4 pt-6 max-w-4xl mx-auto">
      <TasksHeader onCreateTask={() => {}} />
      {(actions.error || query.error || error) && <div role="alert" className="mb-3 rounded border border-amber-500 bg-navy p-3 text-white">
        <p>{error || query.error?.message || actions.error}</p>
        <button className="underline" onClick={() => { setError(null); void actions.refresh(); }}>Refresh confirmed data</button>
      </div>}
      {!canComplete && <p className="mb-3 text-sm text-amber-300">Your relationship permission does not allow task completion. History remains available.</p>}
      <TaskActivity data={query.data} />
      <TasksList tasks={query.data?.tasks.filter(task => !task.deleted_at) ?? []} isLoading={!query.data && !query.isError}
        error={query.error} atomic progress={query.data?.progress} progressErrors={query.data?.progressErrors}
        actionDisabled={!canComplete || pending || saving} onEditTask={canManage && !pending ? task => { setEditing(task); setEditorOpen(true); } : undefined}
        onToggleCompletion={id => void complete(id)} />
      <TaskEditor key={`${key}:${editing?.id ?? 'new'}:${editorOpen}`} isOpen={editorOpen} onClose={close}
        taskData={editing ?? undefined} onSave={save} onDelete={editing ? remove : undefined} atomicAccounting />
    </div>
  </AppLayout>;
}
