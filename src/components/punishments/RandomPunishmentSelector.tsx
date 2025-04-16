
import React, { useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { usePunishments } from '@/contexts/PunishmentsContext';
import { Shuffle } from 'lucide-react';
import { useRandomPunishmentSelection } from './hooks/useRandomPunishmentSelection';
import { useApplyRandomPunishment } from './hooks/useApplyRandomPunishment';
import RandomPunishmentCard from './RandomPunishmentCard';
import RandomPunishmentActions from './RandomPunishmentActions';

interface RandomPunishmentSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const RandomPunishmentSelector: React.FC<RandomPunishmentSelectorProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const { punishments } = usePunishments();
  
  const {
    selectedPunishment,
    isSelecting,
    selectRandomPunishment,
    getCurrentPunishment,
    handleReroll
  } = useRandomPunishmentSelection(isOpen);
  
  const { handlePunish } = useApplyRandomPunishment(onClose);
  
  // Auto-select a random punishment when opened
  useEffect(() => {
    if (isOpen && punishments.length > 0 && !isSelecting && !selectedPunishment) {
      selectRandomPunishment(punishments);
    }
  }, [isOpen, punishments, isSelecting, selectedPunishment, selectRandomPunishment]);
  
  const currentPunishment = getCurrentPunishment();
  
  const onPunishClick = useCallback(() => {
    handlePunish(selectedPunishment);
  }, [handlePunish, selectedPunishment]);
  
  const onRerollClick = useCallback(() => {
    handleReroll(punishments);
  }, [handleReroll, punishments]);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-navy border-light-navy text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <Shuffle className="h-5 w-5 text-red-500" />
            Random Punishment
          </DialogTitle>
          <DialogDescription className="text-white">
            {isSelecting 
              ? "Selecting a random punishment..." 
              : selectedPunishment 
                ? "Your random punishment has been selected!" 
                : "Let's find out what punishment you'll get..."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <RandomPunishmentCard punishment={currentPunishment} />
          
          <RandomPunishmentActions
            isSelecting={isSelecting}
            selectedPunishment={selectedPunishment}
            onPunish={onPunishClick}
            onReroll={onRerollClick}
            onCancel={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RandomPunishmentSelector;
