import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { supabaseBackendId } from '@/integrations/supabase/client';
import { encyclopediaTransport, EncyclopediaError, encyclopediaErrorText } from '@/data/encyclopedia/api';
import { readEncyclopediaDraft, removeEncyclopediaDraft, saveEncyclopediaDraft, type EncyclopediaDraft } from '@/data/encyclopedia/store';
import { patchSchema } from '@/data/encyclopedia/schema';
import type { EncyclopediaEntry, EncyclopediaPatch } from '@/types/encyclopedia';

interface EditorState {
  generation: number; draft: EncyclopediaDraft | null; open: boolean; busy: boolean;
  error: string | null; errorCode: string | null; storageError: string | null; notice: string | null;
}
const blank = (generation: number): EditorState => ({ generation, draft: null, open: false, busy: false, error: null, errorCode: null, storageError: null, notice: null });
export function useEncyclopedia() {
  const { user, loading } = useAuth();
  const accountId = loading ? null : user?.id ?? null;
  const owner = useRef({ accountId, generation: 0 });
  if (owner.current.accountId !== accountId) owner.current = { accountId, generation: owner.current.generation + 1 };
  const generation = owner.current.generation;
  const scope = useMemo(() => accountId ? { backendId: supabaseBackendId, accountId } : null, [accountId]);
  const [editor, setEditor] = useState(() => blank(generation));
  const editorRef = useRef(editor); editorRef.current = editor;
  const active = useRef(false); const operation = useRef<AbortController | null>(null);
  const current = useCallback(() => active.current && owner.current.generation === generation, [generation]);
  const state = editor.generation === generation ? editor : blank(generation);
  const query = useQuery({
    queryKey: ['encyclopedia-library', supabaseBackendId, accountId, generation], enabled: Boolean(scope),
    queryFn: ({ signal }) => encyclopediaTransport.read(scope!, signal),
    staleTime: 0, gcTime: 0, retry: false, refetchOnMount: 'always', refetchOnWindowFocus: true,
  });
  // No unscoped/legacy cache is adopted. Editorial capability always comes from
  // this account's latest completed server read, never its Dom/document role.
  const library = scope && !query.isPlaceholderData ? query.data : undefined;
  const canEdit = Boolean(library?.canEdit && !query.error);

  useLayoutEffect(() => {
    active.current = true;
    try {
      const draft = scope ? readEncyclopediaDraft(scope) : null;
      setEditor({ ...blank(generation), draft, errorCode: draft?.rejectionCode ?? null,
        error: draft?.rejectionCode ? encyclopediaErrorText(new EncyclopediaError(draft.rejectionCode)) : null });
    }
    catch (error) { setEditor({ ...blank(generation), storageError: encyclopediaErrorText(error) }); }
    return () => {
      active.current = false; operation.current?.abort(); operation.current = null;
      const saved = editorRef.current;
      // Flush only the old account's own draft. Deletion tombstones reject late
      // storage writes; never derive this owner from the next signed-in account.
      if (saved.generation === generation && saved.draft) {
        try { saveEncyclopediaDraft(saved.draft, saved.draft.draftId); } catch { /* Keep existing bytes; no request is sent. */ }
      }
    };
  }, [generation, scope]);

  useEffect(() => {
    if (!state.draft || state.busy) return;
    const draft = state.draft;
    const timer = setTimeout(() => {
      if (!current()) return;
      try { saveEncyclopediaDraft(draft, draft.draftId); setEditor(value => ({ ...value, storageError: null })); }
      catch (error) { setEditor(value => ({ ...value, storageError: encyclopediaErrorText(error) })); }
    }, 300);
    return () => clearTimeout(timer);
  }, [state.draft, state.busy, current]);

  const begin = (entry?: EncyclopediaEntry) => {
    if (!current() || !scope || !canEdit || state.draft) return;
    const draft: EncyclopediaDraft = { version: 1, storageRevision: 0, scope, draftId: crypto.randomUUID(), entryId: entry?.id ?? crypto.randomUUID(),
      expectedRevision: entry?.revision ?? 0, patch: entry ? {} : { title: '', subtext: '', titleColor: null, subtextColor: null, contentDocument: { version: 1, blocks: [] } }, intent: null, receipt: null, rejected: false, rejectionCode: null };
    setEditor({ ...blank(generation), draft, open: true });
  };
  const change = (patch: EncyclopediaPatch) => {
    if (!current() || !canEdit || state.busy || state.errorCode === 'ENTRY_REVISION_CONFLICT' || !state.draft || state.draft.receipt || state.draft.intent && !state.draft.rejected) return;
    setEditor(value => ({ ...value, draft: { ...value.draft!, patch: { ...value.draft!.patch, ...patch },
      ...(value.errorCode === 'ENTRY_REVISION_CONFLICT' ? {} : { intent: null, rejected: false, rejectionCode: null }) },
      error: value.errorCode === 'ENTRY_REVISION_CONFLICT' ? value.error : null,
      errorCode: value.errorCode === 'ENTRY_REVISION_CONFLICT' ? value.errorCode : null, notice: null }));
  };
  const close = () => {
    if (state.draft) {
      try { saveEncyclopediaDraft(state.draft, state.draft.draftId); }
      catch (error) { setEditor(value => ({ ...value, storageError: encyclopediaErrorText(error) })); return; }
    }
    setEditor(value => ({ ...value, open: false }));
  };
  const discard = () => {
    if (!state.draft || state.busy || state.draft.intent && !state.draft.rejected && !state.draft.receipt) return;
    try { removeEncyclopediaDraft(state.draft); editorRef.current = blank(generation); setEditor(blank(generation)); }
    catch (error) { setEditor(value => ({ ...value, storageError: encyclopediaErrorText(error) })); }
  };
  const refresh = async () => { const result = await query.refetch({ throwOnError: true }); return result.data!; };
  const reviewLatest = async () => {
    if (!canEdit || !state.draft || state.busy || !state.draft.rejected) return;
    const draft = state.draft; setEditor(value => ({ ...value, busy: true }));
    try {
      const latest = await refresh(); if (!current()) return;
      const entry = latest.entries.find(item => item.id === draft.entryId);
      if (!entry || !latest.canEdit) throw new EncyclopediaError(!entry ? 'ENTRY_NOT_FOUND' : 'EDITOR_REQUIRED');
      const revised = { ...draft, expectedRevision: entry.revision, intent: null, rejected: false, rejectionCode: null };
      saveEncyclopediaDraft(revised, draft.draftId);
      setEditor(value => ({ ...value, draft: revised, busy: false, error: null, errorCode: null,
        notice: 'The latest entry is loaded underneath your draft changes. Review them, then save explicitly.' }));
    } catch (error) { if (current()) setEditor(value => ({ ...value, busy: false, error: encyclopediaErrorText(error) })); }
  };
  const submit = async (kind: 'save' | 'delete' = 'save') => {
    if (!current() || !scope || !state.draft || (!canEdit && !state.draft.receipt) || operation.current || state.busy || state.errorCode === 'ENTRY_REVISION_CONFLICT') return;
    let draft = state.draft;
    try {
      if (!draft.intent || draft.rejected) {
        if (kind === 'save') patchSchema.parse(draft.patch);
        draft = { ...draft, intent: { commandId: crypto.randomUUID(), entryId: draft.entryId, expectedRevision: draft.expectedRevision,
          kind, ...(kind === 'save' ? { patch: draft.patch } : {}) }, rejected: false, rejectionCode: null };
      }
      saveEncyclopediaDraft(draft, draft.draftId); // No durable request means no POST.
    } catch (error) {
      setEditor(value => ({ ...value, storageError: error instanceof EncyclopediaError ? encyclopediaErrorText(error) : 'Review the title, formatting, image and display settings before saving.' })); return;
    }
    const controller = new AbortController(); operation.current = controller;
    setEditor(value => ({ ...value, draft, busy: true, error: null, storageError: null }));
    let completionStage: 'receipt' | 'refresh' | 'cleanup' = 'receipt';
    try {
      if (!draft.receipt) {
        const receipt = await encyclopediaTransport.write(scope, draft.intent!, controller.signal);
        if (!current()) return;
        draft = { ...draft, receipt }; saveEncyclopediaDraft(draft, draft.draftId);
        setEditor(value => ({ ...value, draft }));
      }
      completionStage = 'refresh';
      await refresh(); if (!current()) return;
      completionStage = 'cleanup';
      removeEncyclopediaDraft(draft);
      editorRef.current = blank(generation);
      setEditor({ ...blank(generation), notice: draft.receipt!.replayed ? 'Earlier editorial request confirmed. The current library is displayed.' : draft.receipt!.deleted ? 'Entry deleted.' : 'Entry saved.' });
    } catch (error) {
      if (!current()) return;
      const rejected = !draft.receipt && error instanceof EncyclopediaError && error.definite;
      if (rejected) {
        draft = { ...draft, rejected: true, rejectionCode: error.code };
        try { saveEncyclopediaDraft(draft, draft.draftId); } catch { /* Keep the exact durable request for recovery. */ }
      }
      const errorCode = error instanceof EncyclopediaError ? error.code : null;
      const confirmedError = completionStage === 'receipt'
        ? 'The editorial request was confirmed, but its confirmation could not be saved on this device. Retry to save the confirmation and refresh the library; the request will not be sent again.'
        : completionStage === 'cleanup'
          ? 'The editorial request was confirmed and the library was refreshed, but the saved draft could not be cleared on this device. Retry to finish cleanup; the request will not be sent again.'
          : 'The editorial request was confirmed, but the library could not be refreshed. Retry to refresh; the request will not be sent again.';
      setEditor(value => ({ ...value, draft, busy: false, errorCode,
        error: draft.receipt ? confirmedError : encyclopediaErrorText(error) }));
      if (errorCode === 'EDITOR_REQUIRED' || errorCode === 'AUTHENTICATION_REQUIRED') void query.refetch();
    } finally { if (operation.current === controller) operation.current = null; }
  };
  return { entries: library?.entries ?? [], canEdit, isLoading: Boolean(loading || scope && query.isPending),
    error: query.error, refetch: query.refetch, editor: state,
    begin, change, close, discard, submit, reviewLatest,
    resume: () => { if ((canEdit || state.draft?.receipt) && state.draft) setEditor(value => ({ ...value, open: true })); },
  };
}
