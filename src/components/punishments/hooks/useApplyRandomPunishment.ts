import { useEffect, useRef, useState } from 'react';
import type { ReviewedPunishment } from './randomPunishmentReview';

/** Saving an intent is not a server confirmation. The shared queue owns delivery and retry. */
export function useApplyRandomPunishment(save: (selection: ReviewedPunishment) => Promise<void>, onSaved: () => void) {
  const alive = useRef(false);
  const locked = useRef(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const handlePunish = async (selection: ReviewedPunishment) => {
    if (locked.current) return;
    locked.current = true; setIsApplying(true); setError(null);
    try {
      await save(selection);
      if (alive.current) onSaved();
      // Keep the lock after a durable save, including while the closing render is pending.
    } catch (cause) {
      if (alive.current) {
        locked.current = false; setIsApplying(false);
        setError(cause instanceof Error ? cause.message : 'The action could not be saved. Nothing has been confirmed.');
      }
    }
  };
  return { handlePunish, isApplying, error };
}
