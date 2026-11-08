import React from 'react';
import AppLayout from '@/components/AppLayout';
import EncyclopediaTile from '@/components/encyclopedia/EncyclopediaTile';
import EditEncyclopediaModal from '@/components/encyclopedia/EditEncyclopediaModal';
import { Button } from '@/components/ui/button';
import { useEncyclopedia } from '@/hooks/useEncyclopedia';

export default function Encyclopedia() {
  const library = useEncyclopedia();
  const { entries, canEdit, editor } = library;
  const entry = entries.find(item => item.id === editor.draft?.entryId);
  return <AppLayout>
    <div className="p-4 pt-6 overflow-x-hidden w-full max-w-full"><div className="max-w-screen-lg mx-auto w-full overflow-x-hidden">
      <div className="flex justify-between items-center mb-6 w-full">
        <h1 className="text-2xl font-semibold text-white break-words">Encyclopedia</h1>
        {canEdit && <Button onClick={() => library.begin()} disabled={Boolean(editor.draft)}>Add Entry</Button>}
      </div>
      <div className="bg-navy border border-light-navy rounded-lg p-6 mb-6 w-full max-w-full overflow-x-hidden">
        <p className="text-gray-300 break-words">Welcome to the encyclopedia. This is where you'll find information about the system and how it works.</p>
      </div>
      {editor.notice && <p role="status" className="text-white mb-4">{editor.notice}</p>}
      {editor.storageError && !editor.open && <p role="alert" className="text-white mb-4">{editor.storageError}</p>}
      {editor.draft && !editor.open && <div className="bg-navy rounded border border-light-navy p-4 mb-4 text-white space-y-2">
        <p>{editor.draft.intent && !editor.draft.rejected ? 'An editorial request is saved on this device and still needs confirmation.' : 'An editorial draft is saved on this device.'}</p>
        {canEdit || editor.draft.receipt ? <Button onClick={library.resume}>Resume saved draft</Button> : <p>Editorial permission is required to resume it. Your draft is kept.</p>}
      </div>}
      {library.isLoading ? <p role="status" className="text-center py-8 w-full text-white">Loading encyclopedia entries...</p>
        : library.error ? <div role="alert" className="bg-red-900/50 border border-red-700 rounded-lg p-6 mb-6 text-white">
          <p>Error loading encyclopedia entries.</p><Button onClick={() => void library.refetch()}>Retry loading</Button>
        </div> : entries.length === 0 ? <p className="text-center py-8 w-full text-white">No encyclopedia entries found.</p>
          : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-full overflow-x-hidden">
            {entries.map(item => <div key={item.id} className="w-full max-w-full overflow-x-hidden space-y-2">
              <EncyclopediaTile entry={item} />
              {canEdit && <Button variant="outline" className="text-white" aria-label={`Edit ${item.title}`} disabled={Boolean(editor.draft)} onClick={() => library.begin(item)}>Edit</Button>}
            </div>)}
          </div>}
      {editor.open && editor.draft && <EditEncyclopediaModal key={`${editor.generation}:${editor.draft.draftId}:${editor.draft.expectedRevision}`} isOpen entry={entry}
        draft={editor.draft} canEdit={canEdit} busy={editor.busy} error={editor.error} errorCode={editor.errorCode} storageError={editor.storageError} notice={editor.notice}
        onChange={library.change} onClose={library.close} onDiscard={library.discard} onSubmit={library.submit} onReviewLatest={library.reviewLatest} />}
    </div></div>
  </AppLayout>;
}
