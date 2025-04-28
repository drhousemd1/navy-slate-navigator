
import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { Shuffle } from 'lucide-react';
import RandomPunishmentCard from './RandomPunishmentCard';
import RandomPunishmentActions from './RandomPunishmentActions';
import { PunishmentData } from '@/contexts/punishments/types';

interface RandomPunishmentSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPunishment: PunishmentData | null;
  currentPunishment: PunishmentData | null;
  isSelecting: boolean;
  onPunish: () => void;
  onReroll: () => void;
}

const RandomPunishmentSelector: React.FC<RandomPunishmentSelectorProps> = ({ 
  isOpen, 
  onClose,
  selectedPunishment,
  currentPunishment,
  isSelecting,
  onPunish,
  onReroll
}) => {
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
            onPunish={onPunish}
            onReroll={onReroll}
            onCancel={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RandomPunishmentSelector;
