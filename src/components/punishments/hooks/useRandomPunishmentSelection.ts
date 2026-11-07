import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReviewedPunishment } from './randomPunishmentReview';

const motionQuery = '(prefers-reduced-motion: reduce)';
const reducedMotion = () => typeof window === 'undefined' || !window.matchMedia || window.matchMedia(motionQuery).matches;

export function useRandomPunishmentSelection(punishments: ReviewedPunishment[], isOpen: boolean) {
  const key = JSON.stringify([isOpen, punishments.map(item => item.reviewKey)]);
  const currentView = useRef({ key });
  if (currentView.current.key !== key) currentView.current = { key };
  const view = currentView.current;
  const latest = useRef(punishments); latest.current = punishments;
  const animation = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef<typeof view | null>(null);
  const [selection, setSelection] = useState<{ view: typeof view; item: ReviewedPunishment; selecting: boolean } | null>(null);
  const [invalidated, setInvalidated] = useState(false);
  const stop = useCallback(() => { if (animation.current !== null) clearTimeout(animation.current); animation.current = null; }, []);

  const handleReroll = useCallback(() => {
    stop();
    if (!isOpen || currentView.current !== view || latest.current.length === 0) return;
    initialized.current = view; setInvalidated(false);
    const options = latest.current;
    if (reducedMotion()) {
      setSelection({ view, item: options[Math.floor(Math.random() * options.length)], selecting: false });
      return;
    }
    setSelection({ view, item: options[0], selecting: true });
    let counter = 0;
    const cycle = () => {
      if (currentView.current !== view) return;
      const item = options[Math.floor(Math.random() * options.length)];
      counter++;
      const selecting = counter < 15 && !reducedMotion();
      setSelection({ view, item, selecting });
      animation.current = selecting ? setTimeout(cycle, 80 + counter * 10) : null;
    };
    animation.current = setTimeout(cycle, 80);
  }, [isOpen, view, stop]);

  useEffect(() => {
    stop();
    if (!isOpen) { initialized.current = null; setInvalidated(false); }
    else if (!initialized.current || initialized.current === view) handleReroll();
    else { initialized.current = view; setInvalidated(true); }
    return stop;
  }, [isOpen, view, handleReroll, stop]);

  const visible = selection?.view === view ? selection : null;
  return {
    selectedPunishment: visible && !visible.selecting ? visible.item : null,
    currentPunishment: visible?.item ?? null,
    isSelecting: visible?.selecting ?? false,
    invalidated,
    handleReroll,
  };
}
