import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Coins, X } from 'lucide-react';
import {
  actionFeedbackLedger, feedbackScopeKey, getRefundPresentations,
  type ActionFeedbackLedger, type FeedbackScope, type RefundPresentation, type ScopedActionFeedback,
} from '@/lib/action-feedback';
import './action-feedback.css';

export interface ConfirmedActionFeedbackProps {
  activeScope: FeedbackScope;
  result: ScopedActionFeedback | null;
  /** Explicit caller decision after loading the recipient's preferences.
   * Do not also emit a generic success toast for the same refund.
   */
  enabled: boolean;
  ledger?: ActionFeedbackLedger;
  onDismiss?: (feedback: { eventId: string; recipientParticipantId: string }) => void;
}

const motionQuery = '(prefers-reduced-motion: reduce)';
const reducedMotion = () => typeof window === 'undefined' || !window.matchMedia || window.matchMedia(motionQuery).matches;
function subscribeToMotion(onChange: () => void) {
  const media = window.matchMedia?.(motionQuery);
  media?.addEventListener('change', onChange);
  return () => media?.removeEventListener('change', onChange);
}

/** One mount near the application shell; no portal, focus trap, network call,
 * point mutation, notification delivery, or automatic dismissal timer.
 */
export function ConfirmedActionFeedback(props: ConfirmedActionFeedbackProps) {
  return <ScopedRefundFeedback key={feedbackScopeKey(props.activeScope)} {...props} />;
}

function ScopedRefundFeedback({ activeScope, result, enabled, ledger = actionFeedbackLedger, onDismiss }: ConfirmedActionFeedbackProps) {
  const candidates = useMemo(() => enabled ? getRefundPresentations(result, activeScope) : [], [enabled, result, activeScope]);
  const [visible, setVisible] = useState<RefundPresentation[]>([]);
  useEffect(() => {
    const keys = new Set(candidates.map(item => item.key));
    // Claim outside React's updater: StrictMode may replay updater functions.
    const fresh = candidates.filter(item => ledger.claim(item.key));
    setVisible(previous => [...previous.filter(item => keys.has(item.key)), ...fresh]);
  }, [candidates, ledger]);
  const candidateKeys = new Set(candidates.map(item => item.key));
  const current = visible.filter(item => candidateKeys.has(item.key));

  if (current.length === 0) return null;
  return <section className="action-feedback-stack" aria-label="Confirmed refunds">
    {current.map(item => <RefundCard key={item.key} presentation={item} onDismiss={() => {
      setVisible(previous => previous.filter(value => value.key !== item.key));
      onDismiss?.({ eventId: item.feedback.eventId, recipientParticipantId: item.feedback.recipientParticipantId });
    }} />)}
  </section>;
}

function RefundCard({ presentation, onDismiss }: { presentation: RefundPresentation; onDismiss: () => void }) {
  const id = useId();
  const ref = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const reduceMotion = useSyncExternalStore(subscribeToMotion, reducedMotion, () => true);
  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, []);
  const dismiss = () => {
    const shouldReturnFocus = ref.current?.contains(document.activeElement);
    onDismiss();
    if (shouldReturnFocus && previousFocus.current?.isConnected) previousFocus.current.focus();
  };

  return <article ref={ref} className="action-feedback-card" aria-labelledby={`${id}-title`}
    data-motion={reduceMotion ? 'reduced' : 'full'}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismiss(); }
    }}>
    {!reduceMotion ? <div className="action-feedback-coins" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6, 7].map(index => <span key={index} className={`action-feedback-coin action-feedback-coin-${index}`} />)}
    </div> : null}
    <div className="action-feedback-copy" role="status" aria-live="polite" aria-atomic="true">
      <div className="action-feedback-eyebrow"><Coins size={18} aria-hidden="true" /> Refund confirmed</div>
      <h2 id={`${id}-title`} className="action-feedback-amount">
        {presentation.amount} <span>{presentation.currencyLabel} {presentation.feedback.points === 1 ? 'point' : 'points'} refunded</span>
      </h2>
      <p className="action-feedback-recipient">{presentation.recipient}</p>
      <p className="action-feedback-reward">{presentation.feedback.subjectTitle}</p>
      <p className="action-feedback-reason">{presentation.reason}</p>
      <p className="action-feedback-balance">{presentation.balanceLabel}: <strong>{presentation.balanceAfter} points</strong></p>
    </div>
    <button type="button" className="action-feedback-dismiss" aria-label={`Dismiss refund for ${presentation.feedback.subjectTitle}`} onClick={dismiss}>
      <X size={20} aria-hidden="true" />
    </button>
  </article>;
}
