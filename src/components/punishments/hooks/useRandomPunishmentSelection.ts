
import { useState, useEffect } from 'react';
import { PunishmentData } from '@/contexts/punishments/types';

export const useRandomPunishmentSelection = (isOpen: boolean) => {
  const [selectedPunishment, setSelectedPunishment] = useState<PunishmentData | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Reset selection when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPunishment(null);
      setIsSelecting(false);
    }
  }, [isOpen]);

  const selectRandomPunishment = async (punishments: PunishmentData[]) => {
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

  // Function to get the current punishment or return null
  const getCurrentPunishment = () => {
    return selectedPunishment;
  };

  // Function to handle rerolling (selecting a new random punishment)
  const handleReroll = (punishments: PunishmentData[]) => {
    selectRandomPunishment(punishments);
  };

  return {
    selectedPunishment,
    isSelecting,
    selectRandomPunishment,
    getCurrentPunishment,
    handleReroll
  };
};
