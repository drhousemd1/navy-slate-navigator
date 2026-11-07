import { useEffect, useRef, useState } from 'react';
import { useRandomPunishmentSelection } from './hooks/useRandomPunishmentSelection';
import { useApplyRandomPunishment } from './hooks/useApplyRandomPunishment';
import type { ReviewedPunishment } from './hooks/randomPunishmentReview';
import RandomPunishmentSelector from './RandomPunishmentSelector';

interface RandomPunishmentSelectionsProps {
  options: ReviewedPunishment[];
  unavailableReason: string | null;
  loading: boolean;
  readError: string | null;
  onRefresh: () => Promise<void>;
  onApply: (selection: ReviewedPunishment) => Promise<void>;
  onSaved: () => void;
  onClose: () => void;
}

export default function RandomPunishmentSelections({ options, unavailableReason, loading, readError, onRefresh, onApply, onSaved, onClose }: RandomPunishmentSelectionsProps) {
  const blocked = unavailableReason || readError || (loading ? 'Loading current punishments…' : null);
  const selection = useRandomPunishmentSelection(blocked ? [] : options, true);
  const apply = useApplyRandomPunishment(onApply, onSaved);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const alive = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const refresh = async () => {
    setRefreshing(true); setRefreshError(null);
    try { await onRefresh(); }
    catch { if (alive.current) setRefreshError('Punishments could not be refreshed. Please retry.'); }
    finally { if (alive.current) setRefreshing(false); }
  };
  const message = blocked || (options.length === 0 ? 'No punishments are available. Add a punishment before picking one.'
    : selection.invalidated ? 'Punishments or action details changed. Pick again to review the current details.' : null);
  return <RandomPunishmentSelector
    isOpen onClose={() => { if (!apply.isApplying) onClose(); }}
    selectedPunishment={selection.selectedPunishment} currentPunishment={selection.currentPunishment}
    isSelecting={selection.isSelecting} isApplying={apply.isApplying}
    message={message} error={apply.error || refreshError || readError}
    canPick={!blocked && options.length > 0} refreshing={refreshing}
    onRefresh={() => void refresh()} onReroll={selection.handleReroll}
    onPunish={() => { if (!blocked && selection.selectedPunishment) void apply.handlePunish(selection.selectedPunishment); }} />;
}
