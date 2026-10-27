import type { EditorDraftState } from '@/hooks/useFormStatePersister';

export function EditorDraftNotice({ draft }: { draft: EditorDraftState }) {
  return <div className="mb-3 text-xs text-gray-300">
    {draft.error ? <div role="alert" className="rounded border border-amber-500 p-3"><p>{draft.error}</p><button type="button" className="mt-2 underline" onClick={draft.retryPersistence}>Retry draft storage</button>{draft.unread && <button type="button" className="ml-4 underline" onClick={draft.discardUnreadDraft}>Discard unread saved draft</button>}</div>
      : <p>{draft.hasDraft ? 'Draft saved on this device. ' : ''}Closing keeps your draft. Cancel discards it. Save Changes updates the app when connected.</p>}
  </div>;
}
