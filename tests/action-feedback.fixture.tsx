import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfirmedActionFeedback } from '@/components/activity/ConfirmedActionFeedback';
import type { ActionReceipt } from '@/domain/actions/types';
import type { FeedbackScope, ScopedActionFeedback } from '@/lib/action-feedback';
import '@/index.css';

// Synthetic, backend-free fixture. Not imported by any production route.
export function ActionFeedbackFixture() {
  const [viewer, setViewer] = useState<'sub' | 'dom'>('sub');
  const [period, setPeriod] = useState(1);
  const [sequence, setSequence] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [result, setResult] = useState<ScopedActionFeedback | null>(null);
  const scope: FeedbackScope = { accountId: `fixture-${viewer}`, participantId: `fixture-${viewer}`, relationshipId: `fixture-period-${period}` };
  const confirm = () => {
    const eventId = `fixture-event-${sequence + 1}`;
    setSequence(sequence + 1);
    const receipt: ActionReceipt = {
      commandId: eventId, relationshipId: scope.relationshipId, eventIds: [eventId], confirmedAt: new Date().toISOString(),
      balances: [{ participantId: 'fixture-sub', currency: 'sub', balance: 52 }], availableRewardQuantities: [],
      refunds: [{ participantId: 'fixture-sub', currency: 'sub', paidPoints: 20, migrationCredit: 0, total: 20 }],
      feedback: [{ eventId, recipientParticipantId: 'fixture-sub', subjectTitle: 'Quiet evening together', kind: 'points_refunded',
        reason: 'reward_deleted', currency: 'sub', points: 20, balanceAfter: 52 }],
    };
    setResult({ scope, state: { status: 'confirmed', receipt }, audience: viewer === 'sub' ? { kind: 'recipient' } : {
      kind: 'actor_acknowledgement', recipientParticipantId: 'fixture-sub', recipientRole: 'sub',
    } });
  };
  return <main style={{ height: '100dvh', overflowY: 'auto', background: 'hsl(var(--dark-navy))', color: '#f8fafc', padding: '2rem 1rem' }}>
    <div style={{ maxWidth: 560, margin: '0 auto', display: 'grid', gap: 16 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Confirmed refund — local fixture</h1>
      <p>Synthetic receipts only. No backend, delivery service or points mutation is connected.</p>
      <label>View as <select value={viewer} onChange={event => setViewer(event.target.value as 'dom' | 'sub')} style={{ background: 'hsl(var(--navy))', padding: 8, marginLeft: 8 }}>
        <option value="sub">Sub receiving the refund</option><option value="dom">Dom deleting the partner’s reward</option>
      </select></label>
      <button className="border border-nav-active rounded-md p-3 focus-visible:ring-2" onClick={confirm}>Confirm new refund</button>
      <button className="border border-nav-active rounded-md p-3 focus-visible:ring-2" onClick={() => result && setResult({ ...result })}>Retry same receipt</button>
      <button className="border border-nav-active rounded-md p-3 focus-visible:ring-2" onClick={() => setResult({ scope, audience: { kind: 'recipient' }, state: {
        status: 'pending', command: { kind: 'reward_delete', commandId: 'fixture-pending', expectedRelationshipId: scope.relationshipId, rewardId: 'fixture-reward' },
      } })}>Show pending command</button>
      <button className="border border-nav-active rounded-md p-3 focus-visible:ring-2" onClick={() => setPeriod(period + 1)}>Switch relationship period</button>
      <label><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} /> Enable feedback display in fixture</label>
      <p>Period {period}. State: {result?.state.status ?? 'no command'}.</p>
      <p>The card does not take focus. Tab to its close button and press Enter or Escape. System reduced-motion preferences remove falling coins.</p>
    </div>
    <ConfirmedActionFeedback activeScope={scope} result={result} enabled={enabled} />
  </main>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><ActionFeedbackFixture /></React.StrictMode>);
