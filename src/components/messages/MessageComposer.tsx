import { useColorScheme } from '@/contexts/ColorSchemeContext';
import React from 'react';
import { Button } from '@/components/ui/button';
import { useMessageDraft } from '@/hooks/messages/useMessageDraft';
import type { MessageScope } from '@/data/messages/types';
import MessageInput from './MessageInput';

export default function MessageComposer({ scope, conversationId, canSend, confirmed }: { scope: MessageScope; conversationId: string; canSend: boolean; confirmed: () => void }) {
  const isLightScheme = useColorScheme().currentScheme === 'light-turquoise';
  const { draft, ready, busy, storageError, deliveryError, session } = useMessageDraft(scope, conversationId, confirmed);
  const editing = draft.status === 'editing';
  const hasInput = !!draft.text || !!draft.image;
  return <section aria-label="Message draft" className={`px-4 pb-20 ${isLightScheme ? 'text-foreground' : 'text-white'}`}>
    {storageError && <div role="alert" className={`text-sm ${isLightScheme ? 'text-amber-900' : 'text-amber-200'} mb-2`}><p>{storageError}</p>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => void (ready ? session.retrySave() : session.load())}>{ready ? 'Retry saving draft' : 'Retry loading draft'}</Button>
      {!ready && <Button variant="outline" size="sm" onClick={() => void session.discard()}>Discard unreadable draft</Button>}
    </div>}
    {deliveryError && <p role="alert" className={`text-sm ${isLightScheme ? 'text-amber-900' : 'text-amber-200'} mb-2`}>{deliveryError}</p>}
    {busy && <p role="status" className={`text-sm ${isLightScheme ? 'text-foreground' : 'text-gray-300'}`}>Confirming message… Your draft is retained.</p>}
    {!busy && draft.status === 'unknown' && <p role="status" className={`text-sm ${isLightScheme ? 'text-amber-900' : 'text-amber-200'}`}>Delivery is not confirmed. Keep the original request until its result is known.</p>}
    {draft.status === 'confirmed' && <p role="status" className={`text-sm ${isLightScheme ? 'text-cyan-900' : 'text-cyan-200'}`}>Message delivered. Local draft cleanup is pending.</p>}
    {!editing && <div className="flex flex-wrap gap-2 my-2">
      <Button variant="outline" size="sm" disabled={busy} onClick={() => void session.checkDelivery()}>Check delivery</Button>
      {canSend && draft.status !== 'confirmed' && <Button variant="outline" size="sm" disabled={busy} onClick={() => void session.send()}>Retry same message</Button>}
      {draft.status === 'rejected' && <Button variant="outline" size="sm" disabled={busy} onClick={() => void session.newIntent()}>Edit as a new message</Button>}
    </div>}
    {editing && hasInput && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void session.discard()}>Discard draft</Button>}
    {!canSend && hasInput && <p className={`text-sm ${isLightScheme ? 'text-foreground' : 'text-gray-300'}`}>Your saved draft is retained here. This conversation is read-only.</p>}
    <MessageInput message={draft.text} setMessage={text => session.edit({ text })} imageFile={draft.image} setImageFile={file => session.edit({ image: file, imageName: file?.name ?? null })} handleSendMessage={() => void session.send()} isUploading={busy} disabled={!canSend || !ready || !editing} />
  </section>;
}
