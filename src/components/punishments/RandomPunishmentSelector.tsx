import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { Shuffle } from 'lucide-react';
import RandomPunishmentCard from './RandomPunishmentCard';
import RandomPunishmentActions from './RandomPunishmentActions';
import type { ReviewedPunishment } from './hooks/randomPunishmentReview';

interface RandomPunishmentSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPunishment: ReviewedPunishment | null;
  currentPunishment: ReviewedPunishment | null;
  isSelecting: boolean;
  isApplying: boolean;
  canPick: boolean;
  refreshing: boolean;
  message: string | null;
  error: string | null;
  onRefresh: () => void;
  onPunish: () => void;
  onReroll: () => void;
}

export default function RandomPunishmentSelector({ isOpen, onClose, selectedPunishment, currentPunishment, isSelecting, isApplying,
  canPick, refreshing, message, error, onRefresh, onPunish, onReroll }: RandomPunishmentSelectorProps) {
  return <Dialog open={isOpen} onOpenChange={open => { if (!open && !isApplying) onClose(); }}>
    <DialogContent className="bg-navy border-light-navy text-foreground max-w-md" hideCloseButton={isApplying}
      onEscapeKeyDown={event => { if (isApplying) event.preventDefault(); }}
      onInteractOutside={event => { if (isApplying) event.preventDefault(); }}>
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
          <Shuffle className="h-5 w-5 text-red-500" />Random Punishment
        </DialogTitle>
        <DialogDescription className="text-foreground">
          {isSelecting ? 'Selecting a random punishment…' : selectedPunishment
            ? 'Review the punishment, then apply it or re-roll. Nothing is recorded until you confirm.'
            : 'Pick a punishment to preview before confirming.'}
        </DialogDescription>
      </DialogHeader>
      <div className="py-4">
        <RandomPunishmentCard selection={currentPunishment} />
        {message && message !== error && <p role="status" className="mb-3 text-sm">{message}</p>}
        {error && <p role="alert" className="mb-3 text-sm">{error}</p>}
        <RandomPunishmentActions isSelecting={isSelecting} selectedPunishment={selectedPunishment}
          isApplying={isApplying} canPick={canPick} onPunish={onPunish} onReroll={onReroll} onCancel={onClose} />
        {!canPick && !isApplying && <button disabled={refreshing} className="mt-3 underline disabled:opacity-50" onClick={onRefresh}>
          {refreshing ? 'Refreshing…' : 'Refresh punishments'}
        </button>}
      </div>
    </DialogContent>
  </Dialog>;
}
