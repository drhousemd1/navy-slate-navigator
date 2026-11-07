import { useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { sessionOwner } from '@/lib/ownedSignOut';
import { supabaseBackendId } from '@/integrations/supabase/client';
import { useActivityMetrics } from '@/data/metrics/useActivityMetrics';
import { throneErrorText } from '@/data/throne/api';
import { MAX_CARDS, type ThroneCard } from '@/data/throne/schema';
import { Button } from '@/components/ui/button';
import { useCardData } from './hooks/useCardData';
import ThroneRoomCard from './ThroneRoomCard';
import ThroneRoomEditModal from './ThroneRoomEditModal';

function AccountCards({ accountId, isMonthlyView }: { accountId: string; isMonthlyView: boolean }) {
  const cards = useCardData(accountId);
  const metrics = useActivityMetrics(isMonthlyView ? 'month' : 'week', cards.cards.length > 0);
  const [editor, setEditor] = useState<{ card?: ThroneCard } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  return <section aria-label="Personal Throne Room cards" className="space-y-3 text-foreground">
    <div className="flex flex-wrap gap-3 items-center justify-between"><h2 className="text-xl font-semibold">Your cards</h2>
      <div className="flex gap-2"><Button type="button" variant="outline" disabled={cards.loading || !!editor} onClick={() => void cards.refresh()}>Refresh cards</Button>
        <Button type="button" disabled={cards.loading || !!cards.error || cards.cards.length >= MAX_CARDS} onClick={() => { setNotice(null); setEditor({}); }}>Add card</Button></div>
    </div>
    {notice && <p role="status">{notice}</p>}
    {cards.error ? <p role="alert">{throneErrorText(cards.error)}</p> : cards.loading ? <p role="status">Loading your cards…</p> : !cards.cards.length ? <p>Create a personal card for the recorded activity you want to follow.</p> :
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{cards.cards.map(card => <ThroneRoomCard key={card.id} card={card} metrics={metrics.data} metricsLoading={metrics.isLoading} metricsError={metrics.error}
        isMonthlyView={isMonthlyView} onEdit={() => { setNotice(null); setEditor({ card }); }} />)}</div>}
    {metrics.error && cards.cards.length > 0 && <Button type="button" variant="outline" onClick={() => void metrics.refetch()}>Retry card activity</Button>}
    {editor && <ThroneRoomEditModal key={editor.card?.id ?? 'new'} card={editor.card} onClose={() => setEditor(null)} onSave={async intent => {
      const receipt = await cards.save(intent); setNotice(intent.kind === 'delete' ? 'Card deleted. Recorded activity is unchanged.' : 'Card saved.'); return receipt;
    }} />}
  </section>;
}
export default function PersonalThroneCards({ isMonthlyView }: { isMonthlyView: boolean }) {
  const { user, session } = useAuth();
  const owner = sessionOwner(supabaseBackendId, session);
  if (!owner || owner.accountId !== user?.id) return <p className="text-foreground">Sign in to view your personal cards.</p>;
  // Session boundaries unmount drafts/requests even when the next login uses
  // the same account. Token refreshes retain the session and the current draft.
  return <AccountCards key={`${owner.backendId}:${owner.accountId}:${owner.sessionId}`} accountId={owner.accountId} isMonthlyView={isMonthlyView} />;
}
