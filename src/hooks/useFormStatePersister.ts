import { useEffect, useMemo, useState } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { editorDraftKey, registerDraftForm, type EditorDraftScope } from '@/lib/editorDrafts';
import { toast } from '@/hooks/use-toast';
import { isDeletedAccount } from '@/data/accountDeletion/tombstone';

// Legacy unscoped keys are never read or migrated into a known account.
export const STORAGE_PREFIX = 'kingdom-app-form-';
interface PersisterOptions { scope: EditorDraftScope; debounceMs?: number }
interface DraftStatus { key: string; ready: boolean; error: string | null; hasDraft: boolean; unread: boolean }
export interface EditorDraftState {
  ready: boolean; error: string | null; hasDraft: boolean; unread: boolean;
  clearPersistedState: () => Promise<boolean>; retryPersistence: () => void; discardUnreadDraft: () => void;
}

export function useFormStatePersister<T extends FieldValues>(formId: string, form: UseFormReturn<T>, options: PersisterOptions): EditorDraftState {
  const key = editorDraftKey(options.scope, formId);
  const session = useMemo(() => ({ key, form, pending: null as T | null, timer: null as ReturnType<typeof setTimeout> | null, cleared: false,
    unread: false, edited: new Set<string>(), flush: (_notify = false) => {}, clear: (): boolean => false, retry: () => {}, discardUnread: () => {} }), [key, form]);
  const [state, setState] = useState<DraftStatus>({ key: '', ready: false, error: null, hasDraft: false, unread: false });
  useEffect(() => {
    let mounted = true;
    const releaseImages = registerDraftForm(form);
    const update = (values: Partial<DraftStatus>) => { if (mounted) setState(previous => ({ ...previous, key, ...values })); };
    const fail = (message: string, notify: boolean) => {
      update({ error: message });
      if (notify) toast({ title: 'Local draft needs attention', description: message, variant: 'destructive' });
    };
    const cancelTimer = () => { if (session.timer) clearTimeout(session.timer); session.timer = null; };
    session.flush = (notify = false) => {
      cancelTimer();
      try { if (isDeletedAccount(options.scope.backendId, options.scope.accountId)) return; }
      catch { fail('Device storage could not be checked. The draft was not written.', notify); return; }
      if (!session.pending || session.cleared) return;
      if (session.unread) {
        if (notify) fail('Your earlier draft is still unreadable and has been kept untouched. New edits are only in this editor until you retry or discard that unread draft.', true);
        return;
      }
      try {
        const values = JSON.parse(JSON.stringify(session.pending, (_key, value) => value === undefined ? null : value));
        localStorage.setItem(key, JSON.stringify({ version: 2, key, values }));
        session.pending = null; update({ error: null, hasDraft: true });
      } catch {
        fail('Your latest draft could not be stored on this device. Keep this editor open and retry, or save when connected. Images and other changes may be lost if you leave.', notify);
      }
    };
    session.clear = () => {
      cancelTimer(); session.cleared = true;
      session.retry = () => { session.clear(); };
      try {
        localStorage.removeItem(key); session.pending = null; session.unread = false; session.edited.clear();
        update({ error: null, hasDraft: false, unread: false }); return true;
      } catch {
        fail('The local draft could not be removed. Any confirmed server save is unchanged; this older draft may appear when reopened. Retry before discarding.', true);
        return false;
      }
    };
    const restore = () => {
      try {
        const raw = localStorage.getItem(key);
        const initial = form.getValues();
        if (raw) {
          const draft = JSON.parse(raw);
          if (draft.version !== 2 || draft.key !== key || !draft.values || typeof draft.values !== 'object' || Array.isArray(draft.values)) throw new Error('Invalid draft');
          const restored = Object.fromEntries(Object.keys(initial).filter(name => Object.prototype.hasOwnProperty.call(draft.values, name)).map(name => [name, draft.values[name]]));
          // A failed initial read must not let retry overwrite the fields edited meanwhile.
          for (const name of session.edited) restored[name] = initial[name];
          form.reset({ ...initial, ...restored });
        }
        session.unread = false; session.retry = () => session.flush();
        update({ hasDraft: Boolean(raw), error: null, unread: false });
        if (session.edited.size) { session.pending = form.getValues(); session.flush(); }
      } catch {
        session.unread = true; session.retry = restore;
        update({ unread: true });
        fail('The saved draft could not be loaded and will stay untouched. New edits are only in this editor until you retry or explicitly discard the unread saved draft.', false);
      }
    };
    session.discardUnread = () => {
      const current = form.getValues(); const edited = session.edited.size > 0;
      if (!session.clear()) { session.retry = session.discardUnread; return; }
      session.cleared = false; session.retry = () => session.flush();
      if (edited) { session.pending = current; session.flush(); }
    };
    restore(); update({ ready: true });
    const subscription = form.watch((values, event) => {
      // reset() after a successful save must not recreate the cleared draft.
      if (!event.name) return;
      session.edited.add(event.name.split('.')[0]);
      if (!session.unread) session.retry = () => session.flush();
      session.cleared = false; session.pending = { ...values } as T;
      cancelTimer(); session.timer = setTimeout(() => session.flush(), options.debounceMs ?? 300);
    });
    const flushOnLeave = () => session.flush(true);
    const flushWhenHidden = () => { if (document.visibilityState === 'hidden') flushOnLeave(); };
    window.addEventListener('pagehide', flushOnLeave);
    document.addEventListener('visibilitychange', flushWhenHidden);
    return () => {
      releaseImages(); subscription.unsubscribe(); session.flush(true); mounted = false;
      window.removeEventListener('pagehide', flushOnLeave);
      document.removeEventListener('visibilitychange', flushWhenHidden);
    };
  }, [key, form, session, options.debounceMs, options.scope.backendId, options.scope.accountId]);
  return { ready: state.key === key && state.ready, error: state.key === key ? state.error : null,
    hasDraft: state.key === key && state.hasDraft, unread: state.key === key && state.unread,
    clearPersistedState: async () => session.clear(), retryPersistence: () => session.retry(), discardUnreadDraft: () => session.discardUnread() };
}
