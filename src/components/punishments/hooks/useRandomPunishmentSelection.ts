
import { useState, useEffect } from 'react';
import { usePunishments, PunishmentData } from '@/contexts/PunishmentsContext';

export const useRandomPunishmentSelection = (isOpen: boolean) => {
  const { punishments } = usePunishments();
  const [selectedPunishment, setSelectedPunishment] = useState<PunishmentData | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Reset selection when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPunishment(null);
      setIsSelecting(false);
    }
  }, [isOpen]);

  const selectRandomPunishment = () => {
    if (punishments.length === 0) return;
    
    setIsSelecting(true);
    
    // Set timeout to simulate selection process
    setTimeout(() => {
      const availablePunishments = punishments.filter(p => p.id && !String(p.id).startsWith('temp-'));
      
      if (availablePunishments.length > 0) {
        const randomIndex = Math.floor(Math.random() * availablePunishments.length);
        setSelectedPunishment(availablePunishments[randomIndex]);
      }
      
      setIsSelecting(false);
    }, 1000);
  };

  return {
    selectedPunishment,
    isSelecting,
    selectRandomPunishment
  };
};
