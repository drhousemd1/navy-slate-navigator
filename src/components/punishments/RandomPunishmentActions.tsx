import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { PunishmentData } from '@/contexts/PunishmentsContext';

interface RandomPunishmentActionsProps {
  isSelecting: boolean;
  selectedPunishment: PunishmentData | null;
  onPunish: () => void;
  onReroll: () => void;
  onCancel: () => void;
}

const RandomPunishmentActions: React.FC<RandomPunishmentActionsProps> = ({
  isSelecting,
  selectedPunishment,
  onPunish,
  onReroll,
  onCancel
}) => {
  if (isSelecting) {
    return (
      <div className="flex justify-center mt-4">
        <div className="animate-pulse text-light-navy">
          Selecting punishment...
        </div>
      </div>
    );
  }
  
  if (!selectedPunishment) return null;
  
  return (
    <div className="flex flex-col gap-3 mt-2">
      <Button 
        onClick={onPunish} 
        className="w-full bg-red-600 hover:bg-red-700 text-white"
      >
        Apply Punishment
      </Button>
      
      <div className="flex gap-2">
        <Button 
          onClick={onReroll} 
          className="flex-1 flex items-center justify-center gap-1"
          variant="outline"
          style={{ backgroundColor: '#334155' }}
        >
          <RefreshCw className="h-4 w-4" />
          Re-roll
        </Button>
        <Button 
          onClick={onCancel} 
          className="flex-1 flex items-center justify-center gap-1"
          variant="outline"
          style={{ backgroundColor: '#1e293b' }}
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default RandomPunishmentActions;
