import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import type { ReviewedPunishment } from './hooks/randomPunishmentReview';

interface RandomPunishmentActionsProps {
  isSelecting: boolean;
  selectedPunishment: ReviewedPunishment | null;
  isApplying: boolean;
  canPick: boolean;
  onPunish: () => void;
  onReroll: () => void;
  onCancel: () => void;
}

export default function RandomPunishmentActions({ isSelecting, selectedPunishment, isApplying, canPick, onPunish, onReroll, onCancel }: RandomPunishmentActionsProps) {
  return <div className="flex flex-col gap-3 mt-2">
    {isSelecting && <p role="status" className="text-light-navy motion-safe:animate-pulse text-center">Selecting punishment...</p>}
    {selectedPunishment && <Button onClick={onPunish} disabled={isApplying || !canPick}
      className="w-full bg-red-600 hover:bg-red-700 text-white">
      {isApplying ? 'Saving action…' : 'Apply Punishment'}
    </Button>}
    <div className="flex gap-2">
      {!isSelecting && <Button onClick={onReroll} disabled={isApplying || !canPick}
        className="flex-1 flex items-center justify-center gap-1" variant="outline" style={{ backgroundColor: '#334155' }}>
        <RefreshCw className="h-4 w-4" />{selectedPunishment ? 'Re-roll' : 'Pick again'}
      </Button>}
      <Button onClick={onCancel} disabled={isApplying}
        className="flex-1 flex items-center justify-center gap-1" variant="outline" style={{ backgroundColor: '#1e293b' }}>
        <X className="h-4 w-4" />Cancel
      </Button>
    </div>
  </div>;
}
